/**
 * Unit Tests for SecurityService
 * Tests authentication, encryption, and security features
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SecurityService = require('../../../services/SecurityService');

// Mock dependencies
jest.mock('../../../utils/logger');
jest.mock('../../../database/unified-connection');

describe('SecurityService', () => {
  let securityService;
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeEach(() => {
    // Reset SecurityService instance
    jest.clearAllMocks();
    securityService = require('../../../services/SecurityService');
  });

  describe('JWT Token Management', () => {
    test('should generate valid JWT token', () => {
      const token = securityService.generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token structure
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    test('should verify valid JWT token', () => {
      const token = securityService.generateToken(mockUser);
      const decoded = securityService.verifyToken(token);
      
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        securityService.verifyToken('invalid-token');
      }).toThrow();
    });

    test('should throw error for expired token', () => {
      // Generate token with very short expiry
      const shortLivedToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1ms' }
      );

      // Wait for token to expire
      setTimeout(() => {
        expect(() => {
          securityService.verifyToken(shortLivedToken);
        }).toThrow('TokenExpiredError');
      }, 10);
    });
  });

  describe('Password Security', () => {
    const testPassword = 'TestPassword123!';

    test('should hash password securely', async () => {
      const hashedPassword = await securityService.hashPassword(testPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test('should verify correct password', async () => {
      const hashedPassword = await securityService.hashPassword(testPassword);
      const isValid = await securityService.verifyPassword(testPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const hashedPassword = await securityService.hashPassword(testPassword);
      const isValid = await securityService.verifyPassword('WrongPassword', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    test('should validate password strength', () => {
      const strongPassword = 'StrongPassword123!';
      const weakPassword = '123';
      
      expect(securityService.validatePasswordStrength(strongPassword)).toBe(true);
      expect(securityService.validatePasswordStrength(weakPassword)).toBe(false);
    });
  });

  describe('Data Encryption', () => {
    const testData = 'sensitive-oauth-token';

    test('should encrypt data securely', () => {
      const encrypted = securityService.encrypt(testData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(encrypted.split(':')).toHaveLength(3); // iv:tag:encrypted
    });

    test('should decrypt data correctly', () => {
      const encrypted = securityService.encrypt(testData);
      const decrypted = securityService.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    test('should throw error for invalid encrypted data', () => {
      expect(() => {
        securityService.decrypt('invalid-encrypted-data');
      }).toThrow();
    });
  });

  describe('Rate Limiting', () => {
    test('should create rate limiter with correct options', () => {
      const rateLimiter = securityService.createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5 // 5 attempts
      });
      
      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter).toBe('function');
    });
  });

  describe('Authentication Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        headers: {},
        user: null
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    test('should authenticate valid token', async () => {
      const token = securityService.generateToken(mockUser);
      mockReq.headers.authorization = `Bearer ${token}`;
      
      // Mock database query for user verification
      const { query } = require('../../../database/unified-connection');
      query.mockResolvedValue({
        rows: [{
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
          email_verified: true,
          account_locked_until: null
        }]
      });

      const authMiddleware = securityService.authMiddleware();
      await authMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(mockUser.id);
    });

    test('should reject request without token', async () => {
      const authMiddleware = securityService.authMiddleware();
      await authMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Access token required',
          code: 401
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      
      const authMiddleware = securityService.authMiddleware();
      await authMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'INVALID_TOKEN',
          message: 'Invalid token format',
          code: 401
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Security Validation', () => {
    test('should validate email format', () => {
      expect(securityService.validateEmail('test@example.com')).toBe(true);
      expect(securityService.validateEmail('invalid-email')).toBe(false);
      expect(securityService.validateEmail('')).toBe(false);
    });

    test('should sanitize input data', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = securityService.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    test('should detect SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const isMalicious = securityService.detectSQLInjection(sqlInjection);
      
      expect(isMalicious).toBe(true);
    });
  });

  describe('Session Management', () => {
    test('should generate secure session ID', () => {
      const sessionId = securityService.generateSessionId();
      
      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBeGreaterThan(20);
      expect(typeof sessionId).toBe('string');
    });

    test('should validate session format', () => {
      const validSession = securityService.generateSessionId();
      const invalidSession = 'invalid-session';
      
      expect(securityService.validateSessionId(validSession)).toBe(true);
      expect(securityService.validateSessionId(invalidSession)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle encryption errors gracefully', () => {
      // Mock crypto to throw error
      const originalEncrypt = securityService.encrypt;
      securityService.encrypt = jest.fn().mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      expect(() => {
        securityService.encrypt('test-data');
      }).toThrow('Encryption failed');

      // Restore original method
      securityService.encrypt = originalEncrypt;
    });

    test('should handle JWT errors gracefully', () => {
      const invalidToken = 'definitely.not.a.jwt.token';
      
      expect(() => {
        securityService.verifyToken(invalidToken);
      }).toThrow();
    });
  });

  describe('Performance', () => {
    test('should hash password within reasonable time', async () => {
      const startTime = Date.now();
      await securityService.hashPassword('TestPassword123!');
      const duration = Date.now() - startTime;
      
      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should encrypt/decrypt within reasonable time', () => {
      const testData = 'test-data-for-performance';
      
      const startTime = Date.now();
      const encrypted = securityService.encrypt(testData);
      const decrypted = securityService.decrypt(encrypted);
      const duration = Date.now() - startTime;
      
      expect(decrypted).toBe(testData);
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});
