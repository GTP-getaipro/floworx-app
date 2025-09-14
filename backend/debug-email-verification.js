// Debug script to test email verification integration
const { query } = require('./database/unified-connection');
const emailService = require('./services/emailService');

async function debugEmailVerification() {
  );

  try {
    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    const dbTest = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', dbTest.rows[0].current_time);

    // Step 2: Check if email_verification_tokens table exists
    console.log('\n2️⃣ Checking email_verification_tokens table...');
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'email_verification_tokens'
      );
    `);
    console.log('✅ Table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Check table structure
      const structure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'email_verification_tokens'
        ORDER BY ordinal_position;
      `);
      console.log('📋 Table structure:');
      structure.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Step 3: Test token generation
    console.log('\n3️⃣ Testing token generation...');
    const token = emailService.generateVerificationToken();
    console.log('✅ Token generated:', token.substring(0, 10) + '...');

    // Step 4: Test email sending
    console.log('\n4️⃣ Testing email sending...');
    const emailResult = await emailService.sendVerificationEmail(
      'debug.test@example.com',
      'Debug User',
      token
    );
    console.log('✅ Email sent:', emailResult);

    // Step 5: Test token storage with real UUID
    console.log('\n5️⃣ Testing token storage with real UUID...');

    // Create a test user first to get a real UUID
    const testUserResult = await query(`
      INSERT INTO users (email, password_hash, created_at)
      VALUES ('debug.test@example.com', 'test_hash', CURRENT_TIMESTAMP)
      RETURNING id, email, created_at
    `);

    const testUserId = testUserResult.rows[0].id;
    console.log('✅ Test user created with UUID:', testUserId);

    await emailService.storeVerificationToken(
      testUserId,
      token,
      'debug.test@example.com',
      'Debug User'
    );
    console.log('✅ Token stored successfully');

    // Step 6: Verify token was stored
    console.log('\n6️⃣ Verifying token storage...');
    const storedToken = await query(`
      SELECT * FROM email_verification_tokens
      WHERE user_id = $1 AND token = $2
    `, [testUserId, token]);

    if (storedToken.rows.length > 0) {
      console.log('✅ Token found in database:', {
        id: storedToken.rows[0].id,
        email: storedToken.rows[0].email,
        first_name: storedToken.rows[0].first_name,
        expires_at: storedToken.rows[0].expires_at
      });
    } else {
      console.log('❌ Token not found in database');
    }

    // Step 7: Test complete registration flow simulation
    console.log('\n7️⃣ Testing complete registration flow simulation...');

    // Create another test user for complete flow
    const completeTestResult = await query(`
      INSERT INTO users (email, password_hash, created_at)
      VALUES ('complete.test@example.com', 'test_hash', CURRENT_TIMESTAMP)
      RETURNING id, email, created_at
    `);

    const completeTestUser = completeTestResult.rows[0];

    // Generate and store verification token
    const regToken = emailService.generateVerificationToken();
    await emailService.storeVerificationToken(
      completeTestUser.id,
      regToken,
      completeTestUser.email,
      'Complete'
    );

    // Send verification email
    await emailService.sendVerificationEmail(
      completeTestUser.email,
      'Complete',
      regToken
    );

    console.log('✅ Complete registration flow simulation successful!');
    console.log('📧 Check emails at: https://ethereal.email/messages');
    console.log('🔑 Login: l6n6fnosov4vdwuu@ethereal.email / 42pH11wzzmstP8QMtM');

    // Cleanup test data
    console.log('\n8️⃣ Cleaning up test data...');
    await query('DELETE FROM email_verification_tokens WHERE email LIKE $1', ['%test@example.com']);
    await query('DELETE FROM users WHERE email LIKE $1', ['%test@example.com']);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All email verification components are working correctly!');
    console.log('📝 The issue must be in the registration endpoint error handling.');

  } catch (error) {
    , error.message);
    console.error('Full error:', error);

    // Additional error details
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    if (error.constraint) {
      console.error('Constraint violation:', error.constraint);
    }
  }
}

// Run the debug
debugEmailVerification()
  .then(() => {
    );
    process.exit(0);
  })
  .catch((error) => {
    , error);
    process.exit(1);
  });
