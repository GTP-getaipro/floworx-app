/**
 * Simple Test to Verify Test Infrastructure
 */

describe('Test Infrastructure Verification', () => {
  test('Jest is working correctly', () => {
    expect(1 + 1).toBe(2);
  });

  test('Environment variables are loaded', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('Test fixtures are accessible', () => {
    const testData = require('./fixtures/testData');
    expect(testData).toBeDefined();
    expect(testData.businessTypes).toBeDefined();
    expect(testData.users).toBeDefined();
  });
});
