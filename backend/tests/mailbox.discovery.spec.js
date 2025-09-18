/**
 * Mailbox Discovery & Provisioning Tests
 * Tests for mailbox taxonomy discovery, provisioning, and mapping
 */

const request = require('supertest');
const nock = require('nock');
const app = require('../server');
const { query } = require('../database/unified-connection');
const { encrypt } = require('../utils/encryption');

describe('Mailbox Discovery & Provisioning', () => {
  let authToken;
  let userId;
  let testUser;

  beforeAll(async () => {
    // Create test user
    const userResult = await query(
      'INSERT INTO users (email, password_hash, first_name, last_name, email_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['test@example.com', 'hashedpassword', 'Test', 'User', true]
    );
    userId = userResult.rows[0].id;
    testUser = { id: userId, email: 'test@example.com' };

    // Create auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');

    // Store test Gmail credentials
    const encryptedAccessToken = encrypt('test-access-token');
    const encryptedRefreshToken = encrypt('test-refresh-token');
    
    await query(
      'INSERT INTO credentials (user_id, service_name, access_token, refresh_token) VALUES ($1, $2, $3, $4)',
      [userId, 'google', encryptedAccessToken, encryptedRefreshToken]
    );
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM mailbox_mappings WHERE user_id = $1', [userId]);
    await query('DELETE FROM credentials WHERE user_id = $1', [userId]);
    await query('DELETE FROM users WHERE id = $1', [userId]);
  });

  beforeEach(() => {
    // Clear any existing nock interceptors
    nock.cleanAll();
  });

  describe('GET /api/mailbox/discover', () => {
    it('should discover Gmail labels and return suggested mapping', async () => {
      // Mock Gmail API response
      nock('https://gmail.googleapis.com')
        .get('/gmail/v1/users/me/labels')
        .reply(200, {
          labels: [
            {
              id: 'Label_1',
              name: 'URGENT',
              type: 'user',
              messageListVisibility: 'show',
              labelListVisibility: 'labelShow',
              messagesTotal: 5,
              messagesUnread: 2
            },
            {
              id: 'Label_2',
              name: 'Customer Support',
              type: 'user',
              messageListVisibility: 'show',
              labelListVisibility: 'labelShow',
              messagesTotal: 10,
              messagesUnread: 3
            },
            {
              id: 'INBOX',
              name: 'INBOX',
              type: 'system',
              messageListVisibility: 'show',
              labelListVisibility: 'labelShow'
            }
          ]
        });

      const response = await request(app)
        .get('/api/mailbox/discover?provider=gmail')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        provider: 'gmail',
        businessType: 'default',
        existing: {
          totalItems: 2, // Only user labels
          userItems: 2,
          systemItems: 1,
          items: expect.arrayContaining([
            expect.objectContaining({
              id: 'Label_1',
              name: 'URGENT',
              path: ['URGENT']
            })
          ])
        },
        suggestedMapping: expect.objectContaining({
          URGENT: expect.objectContaining({
            action: 'reuse',
            existingId: 'Label_1'
          }),
          SUPPORT: expect.objectContaining({
            action: 'reuse_partial',
            existingId: 'Label_2'
          })
        }),
        missingCount: expect.any(Number)
      });
    });

    it('should handle business type parameter', async () => {
      nock('https://gmail.googleapis.com')
        .get('/gmail/v1/users/me/labels')
        .reply(200, { labels: [] });

      const response = await request(app)
        .get('/api/mailbox/discover?provider=gmail&businessType=banking')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.businessType).toBe('banking');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .get('/api/mailbox/discover?provider=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/mailbox/discover?provider=gmail')
        .expect(401);
    });

    it('should handle Gmail API errors gracefully', async () => {
      nock('https://gmail.googleapis.com')
        .get('/gmail/v1/users/me/labels')
        .reply(403, { error: { message: 'Insufficient permissions' } });

      const response = await request(app)
        .get('/api/mailbox/discover?provider=gmail')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('DISCOVERY_FAILED');
    });
  });

  describe('POST /api/mailbox/provision', () => {
    it('should provision missing Gmail labels', async () => {
      // Mock Gmail API calls
      nock('https://gmail.googleapis.com')
        .get('/gmail/v1/users/me/labels')
        .reply(200, { labels: [] }) // No existing labels
        .post('/gmail/v1/users/me/labels')
        .reply(200, {
          id: 'Label_New_1',
          name: 'SALES',
          type: 'user',
          color: { backgroundColor: '#00FF00' }
        })
        .post('/gmail/v1/users/me/labels')
        .reply(200, {
          id: 'Label_New_2',
          name: 'SUPPORT',
          type: 'user',
          color: { backgroundColor: '#0000FF' }
        });

      const response = await request(app)
        .post('/api/mailbox/provision')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          provider: 'gmail',
          items: [
            { path: ['SALES'], color: '#00FF00' },
            { path: ['SUPPORT'], color: '#0000FF' }
          ]
        })
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        provider: 'gmail',
        created: expect.arrayContaining([
          expect.objectContaining({
            path: ['SALES'],
            id: 'Label_New_1'
          }),
          expect.objectContaining({
            path: ['SUPPORT'],
            id: 'Label_New_2'
          })
        ]),
        skipped: [],
        failed: [],
        summary: {
          totalRequested: 2,
          totalCreated: 2,
          totalSkipped: 0,
          totalFailed: 0
        }
      });
    });

    it('should skip existing labels (idempotent)', async () => {
      // Mock Gmail API to return existing label
      nock('https://gmail.googleapis.com')
        .get('/gmail/v1/users/me/labels')
        .reply(200, {
          labels: [
            {
              id: 'Label_Existing',
              name: 'URGENT',
              type: 'user'
            }
          ]
        });

      const response = await request(app)
        .post('/api/mailbox/provision')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          provider: 'gmail',
          items: [
            { path: ['URGENT'], color: '#FF0000' }
          ]
        })
        .expect(200);

      expect(response.body.skipped).toHaveLength(1);
      expect(response.body.skipped[0]).toMatchObject({
        path: ['URGENT'],
        reason: 'already_exists'
      });
    });

    it('should require CSRF token', async () => {
      await request(app)
        .post('/api/mailbox/provision')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'gmail',
          items: [{ path: ['TEST'], color: '#FF0000' }]
        })
        .expect(403);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/mailbox/provision')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          provider: 'invalid',
          items: []
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/mailbox/mapping', () => {
    it('should save mailbox mapping and increment version', async () => {
      const mapping = {
        URGENT: {
          canonicalKey: 'URGENT',
          path: ['URGENT'],
          color: '#FF0000',
          existingId: 'Label_1',
          action: 'reuse'
        },
        SALES: {
          canonicalKey: 'SALES',
          path: ['SALES'],
          color: '#00FF00',
          action: 'create'
        }
      };

      const response = await request(app)
        .put('/api/mailbox/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          provider: 'gmail',
          mapping: mapping
        })
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        provider: 'gmail',
        version: 1,
        mappingKeys: 2
      });

      // Verify mapping was saved
      const savedMapping = await query(
        'SELECT mapping, version FROM mailbox_mappings WHERE user_id = $1 AND provider = $2',
        [userId, 'gmail']
      );

      expect(savedMapping.rows).toHaveLength(1);
      expect(savedMapping.rows[0].mapping).toEqual(mapping);
      expect(savedMapping.rows[0].version).toBe(1);
    });

    it('should increment version on update', async () => {
      // First save
      await request(app)
        .put('/api/mailbox/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          provider: 'gmail',
          mapping: { test: 'mapping1' }
        })
        .expect(200);

      // Second save (update)
      const response = await request(app)
        .put('/api/mailbox/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          provider: 'gmail',
          mapping: { test: 'mapping2' }
        })
        .expect(200);

      expect(response.body.version).toBe(2);
    });
  });

  describe('GET /api/mailbox/mapping', () => {
    beforeEach(async () => {
      // Insert test mapping
      await query(
        'INSERT INTO mailbox_mappings (user_id, provider, mapping, version) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, provider) DO UPDATE SET mapping = EXCLUDED.mapping, version = EXCLUDED.version',
        [userId, 'gmail', JSON.stringify({ test: 'mapping' }), 1]
      );
    });

    it('should retrieve saved mailbox mapping', async () => {
      const response = await request(app)
        .get('/api/mailbox/mapping?provider=gmail')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        provider: 'gmail',
        mapping: { test: 'mapping' },
        version: 1
      });
    });

    it('should return 404 for non-existent mapping', async () => {
      const response = await request(app)
        .get('/api/mailbox/mapping?provider=o365')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('MAPPING_NOT_FOUND');
    });
  });
});
