/**
 * Framework Demo Test - Environment Configuration Validation
 * This test verifies that the test environment is properly configured
 */

describe('Test Environment Configuration', () => {
  beforeAll(() => {
    console.log('Test environment loaded: NODE_ENV=' + process.env.NODE_ENV);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
    console.log('ENCRYPTION_KEY length:', process.env.ENCRYPTION_KEY?.length);
  });

  test('should have NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('should have JWT_SECRET configured', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  test('should have ENCRYPTION_KEY configured', () => {
    expect(process.env.ENCRYPTION_KEY).toBeDefined();
    expect(process.env.ENCRYPTION_KEY.length).toBeGreaterThan(0);
  });

  test('should load environment variables from setupEnv.js', () => {
    // These should be loaded from setupEnv.js
    expect(process.env.TEST_SERVER_PORT).toBe('5001');
    expect(process.env.TEST_LOG_LEVEL).toBe('dev');
  });

  test('should have fallback safeguards working', () => {
    // Test that our setupEnv.js fallbacks are working
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeTruthy();
    expect(process.env.ENCRYPTION_KEY).toBeTruthy();
  });
});
