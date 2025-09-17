// Fallback safeguards for test environment
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "supersecretfortests1234567890abcdef";
}

if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = "testencryptionkey123456789012345678901234567890";
}

// Set test-specific environment variables
process.env.TEST_SERVER_PORT = "5001";
process.env.TEST_LOG_LEVEL = "dev";
process.env.TEST_USER_EMAIL = "test.integration@floworx-iq.com";
process.env.TEST_USER_PASSWORD = "IntegrationTest123!";
process.env.TEST_ADMIN_EMAIL = "test.admin@example.com";
process.env.TEST_ADMIN_PASSWORD = "AdminPass123!";
process.env.TEST_TIMEOUT = "30000";
process.env.TEST_SETUP_TIMEOUT = "60000";
process.env.DATABASE_URL = "your_test_database_url";

// Verify critical environment variables
if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

console.log(`Test environment loaded: NODE_ENV=${process.env.NODE_ENV}`);
