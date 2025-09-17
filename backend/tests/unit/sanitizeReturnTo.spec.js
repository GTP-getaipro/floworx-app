const { sanitizeReturnTo } = require('../../utils/urls');

describe('sanitizeReturnTo', () => {
  describe('valid paths', () => {
    it('should allow simple absolute paths', () => {
      expect(sanitizeReturnTo('/dashboard')).toBe('/dashboard');
      expect(sanitizeReturnTo('/inbox')).toBe('/inbox');
      expect(sanitizeReturnTo('/settings')).toBe('/settings');
    });

    it('should allow paths with query parameters', () => {
      expect(sanitizeReturnTo('/dashboard?tab=1')).toBe('/dashboard?tab=1');
      expect(sanitizeReturnTo('/inbox?filter=unread')).toBe('/inbox?filter=unread');
    });

    it('should allow paths with hash fragments', () => {
      expect(sanitizeReturnTo('/dashboard#section1')).toBe('/dashboard#section1');
      expect(sanitizeReturnTo('/settings#profile')).toBe('/settings#profile');
    });

    it('should allow paths with both query and hash', () => {
      expect(sanitizeReturnTo('/dashboard?tab=1#section2')).toBe('/dashboard?tab=1#section2');
    });

    it('should allow nested paths', () => {
      expect(sanitizeReturnTo('/admin/users')).toBe('/admin/users');
      expect(sanitizeReturnTo('/api/v1/test')).toBe('/api/v1/test');
    });
  });

  describe('invalid paths', () => {
    it('should reject external URLs with http protocol', () => {
      expect(sanitizeReturnTo('http://evil.com')).toBe(null);
      expect(sanitizeReturnTo('http://example.com/path')).toBe(null);
    });

    it('should reject external URLs with https protocol', () => {
      expect(sanitizeReturnTo('https://evil.com')).toBe(null);
      expect(sanitizeReturnTo('https://example.com/path')).toBe(null);
    });

    it('should reject protocol-relative URLs', () => {
      expect(sanitizeReturnTo('//evil.com')).toBe(null);
      expect(sanitizeReturnTo('//example.com/path')).toBe(null);
    });

    it('should reject javascript: URLs', () => {
      expect(sanitizeReturnTo('javascript:alert(1)')).toBe(null);
      expect(sanitizeReturnTo('javascript:void(0)')).toBe(null);
    });

    it('should reject other protocols', () => {
      expect(sanitizeReturnTo('ftp://example.com')).toBe(null);
      expect(sanitizeReturnTo('data:text/html,<script>alert(1)</script>')).toBe(null);
      expect(sanitizeReturnTo('mailto:test@example.com')).toBe(null);
    });

    it('should reject paths with backslashes', () => {
      expect(sanitizeReturnTo('/path\\to\\file')).toBe(null);
      expect(sanitizeReturnTo('\\windows\\path')).toBe(null);
    });

    it('should reject relative paths', () => {
      expect(sanitizeReturnTo('dashboard')).toBe(null);
      expect(sanitizeReturnTo('./dashboard')).toBe(null);
      expect(sanitizeReturnTo('../admin')).toBe(null);
    });

    it('should handle null/undefined/empty values', () => {
      expect(sanitizeReturnTo(null)).toBe(null);
      expect(sanitizeReturnTo(undefined)).toBe(null);
      expect(sanitizeReturnTo('')).toBe(null);
      expect(sanitizeReturnTo('   ')).toBe(null);
    });

    it('should reject non-string values', () => {
      expect(sanitizeReturnTo(123)).toBe(null);
      expect(sanitizeReturnTo({})).toBe(null);
      expect(sanitizeReturnTo([])).toBe(null);
      expect(sanitizeReturnTo(true)).toBe(null);
    });
  });
});
