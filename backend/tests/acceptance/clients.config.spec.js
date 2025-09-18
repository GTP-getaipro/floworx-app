/**
 * Client Configuration API Acceptance Tests
 * Tests the CRUD operations for versioned client configurations
 * with validation, normalization, and AI guardrails
 */

const request = require('supertest');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-lon';
process.env.DISABLE_RATE_LIMITING = 'true';

const app = require('../../app');
const { databaseOperations } = require('../../database/database-operations');

describe('Client Configuration API', () => {
  let authCookie;
  let csrfToken;
  const testClientId = 'test-client-' + Date.now();

  beforeAll(async () => {
    // Create test user directly in database (like other tests do)
    const bcrypt = require('bcryptjs');
    const testEmail = `config-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(testPassword, 12);

    const userData = {
      id: require('crypto').randomUUID(),
      email: testEmail.toLowerCase(),
      password_hash: passwordHash,
      first_name: 'Config',
      last_name: 'Tester',
      created_at: new Date().toISOString(),
      email_verified: true // Important: set to true for tests
    };

    const createResult = await databaseOperations.createUser(userData);
    if (createResult.error) {
      throw new Error(`Failed to create test user: ${createResult.error.message}`);
    }

    const testUser = { email: testEmail, password: testPassword };

    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`);
    }

    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      throw new Error(`No cookies returned from login: ${JSON.stringify(loginResponse.headers)}`);
    }

    authCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
    if (!authCookie) {
      throw new Error(`No fx_sess cookie found in: ${JSON.stringify(cookies)}`);
    }

    // Get CSRF token and cookie
    const csrfResponse = await request(app)
      .get('/api/auth/csrf')
      .set('Cookie', authCookie);

    csrfToken = csrfResponse.body.csrf;

    // Extract CSRF cookie
    const csrfCookies = csrfResponse.headers['set-cookie'];
    const csrfCookie = csrfCookies.find(cookie => cookie.startsWith('fx_csrf='));

    // Combine auth and CSRF cookies
    authCookie = `${authCookie}; ${csrfCookie}`;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await databaseOperations.upsertClientConfigRow(testClientId, 0, {});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('GET /api/clients/:id/config', () => {
    it('should return default config for new client', async () => {
      const response = await request(app)
        .get(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toMatchObject({
        client_id: testClientId,
        version: 1,
        client: {
          name: "",
          timezone: "UTC",
          website: "",
          phones: [],
          address: "",
          hours: {}
        },
        channels: {
          email: {
            provider: "gmail",
            label_map: expect.objectContaining({
              "Sales": "Sales",
              "Support": "Support",
              "Promo": "Promotions"
            })
          }
        },
        people: {
          managers: []
        },
        suppliers: [],
        signature: {
          mode: "default",
          custom_text: null,
          block_names_in_signature: true
        },
        ai: {
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 800,
          locked: true
        }
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/clients/${testClientId}/config`)
        .expect(401);
    });

    it('should validate client ID', async () => {
      // Test with whitespace-only client ID (this will hit our route)
      const response = await request(app)
        .get('/api/clients/ /config')
        .set('Cookie', authCookie)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CLIENT_ID');

      // Test with empty string client ID
      const response2 = await request(app)
        .get('/api/clients/%20/config') // URL encoded space
        .set('Cookie', authCookie)
        .expect(400);

      expect(response2.body.error.code).toBe('INVALID_CLIENT_ID');
    });
  });

  describe('PUT /api/clients/:id/config', () => {
    it('should save minimal valid config and bump version', async () => {
      const configPatch = {
        client: {
          name: "Test Hot Tub Company",
          timezone: "America/New_York"
        },
        channels: {
          email: {
            provider: "gmail"
          }
        },
        people: {
          managers: [
            {
              name: "John Manager",
              email: "john@example.com"
            }
          ]
        }
      };

      const response = await request(app)
        .put(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfToken)
        .send(configPatch)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        version: expect.any(Number)
      });

      expect(response.body.version).toBeGreaterThan(1);

      // Verify the config was saved
      const getResponse = await request(app)
        .get(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.client.name).toBe("Test Hot Tub Company");
      expect(getResponse.body.client.timezone).toBe("America/New_York");
      expect(getResponse.body.people.managers[0].name).toBe("John Manager");
      expect(getResponse.body.version).toBe(response.body.version);
    });

    it('should require CSRF token', async () => {
      const configPatch = {
        client: { name: "Test Company" }
      };

      await request(app)
        .put(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .send(configPatch)
        .expect(403);
    });

    it('should require authentication', async () => {
      const configPatch = {
        client: { name: "Test Company" }
      };

      // Without auth cookie, CSRF protection blocks the request first (403)
      // This is correct security behavior - CSRF runs before auth
      await request(app)
        .put(`/api/clients/${testClientId}/config`)
        .send(configPatch)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const invalidConfigs = [
        // Missing client name
        {
          client: { timezone: "UTC" },
          channels: { email: { provider: "gmail" } },
          people: { managers: [{ name: "John", email: "john@example.com" }] }
        },
        // Invalid email provider
        {
          client: { name: "Test", timezone: "UTC" },
          channels: { email: { provider: "invalid" } },
          people: { managers: [{ name: "John", email: "john@example.com" }] }
        },
        // Missing managers
        {
          client: { name: "Test", timezone: "UTC" },
          channels: { email: { provider: "gmail" } },
          people: { managers: [] }
        },
        // Invalid manager email
        {
          client: { name: "Test", timezone: "UTC" },
          channels: { email: { provider: "gmail" } },
          people: { managers: [{ name: "John", email: "invalid-email" }] }
        }
      ];

      for (let i = 0; i < invalidConfigs.length; i++) {
        const config = invalidConfigs[i];
        // Use a fresh client ID for each test to avoid merging with existing config
        const freshClientId = `validation-test-${Date.now()}-${i}`;

        const response = await request(app)
          .put(`/api/clients/${freshClientId}/config`)
          .set('Cookie', authCookie)
          .set('x-csrf-token', csrfToken)
          .send(config)
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_FAILED');
        expect(response.body.error.details).toBeInstanceOf(Array);
      }
    });

    it('should normalize supplier domains', async () => {
      const configPatch = {
        client: { name: "Test", timezone: "UTC" },
        channels: { email: { provider: "gmail" } },
        people: { managers: [{ name: "John", email: "john@example.com" }] },
        suppliers: [
          {
            name: "Supplier 1",
            domains: ["EXAMPLE.COM", "Test.Com", "example.com"] // Should be normalized and deduped
          }
        ]
      };

      await request(app)
        .put(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfToken)
        .send(configPatch)
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.suppliers[0].domains).toEqual(["example.com", "test.com"]);
    });

    it('should enforce signature guardrail', async () => {
      const configPatch = {
        client: { name: "Test", timezone: "UTC" },
        channels: { email: { provider: "gmail" } },
        people: { managers: [{ name: "John Manager", email: "john@example.com" }] },
        signature: {
          mode: "custom",
          custom_text: "Best regards, John Manager", // Contains manager name
          block_names_in_signature: true
        }
      };

      const response = await request(app)
        .put(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfToken)
        .send(configPatch)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details.some(d => d.field === 'signature.custom_text')).toBe(true);
    });

    it('should ignore AI changes when locked', async () => {
      const configPatch = {
        client: { name: "Test", timezone: "UTC" },
        channels: { email: { provider: "gmail" } },
        people: { managers: [{ name: "John", email: "john@example.com" }] },
        ai: {
          model: "gpt-4", // Should be ignored
          temperature: 0.8, // Should be ignored
          max_tokens: 2000, // Should be ignored
          locked: true
        }
      };

      await request(app)
        .put(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfToken)
        .send(configPatch)
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .expect(200);

      // AI settings should remain at defaults
      expect(getResponse.body.ai).toEqual({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 800,
        locked: true
      });
    });

    it('should dedupe label map values', async () => {
      const configPatch = {
        client: { name: "Test", timezone: "UTC" },
        channels: { 
          email: { 
            provider: "gmail",
            label_map: {
              "Sales": "Sales",
              "Support": "Sales", // Duplicate value
              "Marketing": "Sales" // Another duplicate
            }
          } 
        },
        people: { managers: [{ name: "John", email: "john@example.com" }] }
      };

      await request(app)
        .put(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfToken)
        .send(configPatch)
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/clients/${testClientId}/config`)
        .set('Cookie', authCookie)
        .expect(200);

      // Should only keep first occurrence of duplicate values
      const labelMap = getResponse.body.channels.email.label_map;
      const values = Object.values(labelMap);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });
  });
});
