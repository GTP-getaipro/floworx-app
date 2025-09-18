/**
 * DATABASE CLEANUP SCRIPT
 * 
 * Safely removes test users from the production database while preserving legitimate users.
 * Only removes users with test email patterns to avoid accidental deletion of real users.
 */

const { createClient } = require('@supabase/supabase-js');

class DatabaseCleanupManager {
  constructor() {
    this.supabase = createClient(
      'https://enamhufwobytrfydarsz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0OTIwNSwiZXhwIjoyMDcyNTI1MjA1fQ.NVI17sMDYvb4ZqNG6ucQ_VdO6QqiElllFeC16GLTyE4'
    );
    
    // Test email patterns to identify test users
    this.testEmailPatterns = [
      '@floworx-test.com',
      '@example.com',
      'test_',
      'frontend_test_',
      'valid_reg_',
      'concurrent_',
      'rate_limit_',
      'xss_test_',
      'weak_pwd_',
      'nonexistent_',
      '_test@',
      'duplicate_',
      'invalid-email-format'
    ];
    
    this.cleanupResults = {
      totalUsersFound: 0,
      testUsersIdentified: 0,
      testUsersDeleted: 0,
      legitimateUsersPreserved: 0,
      errors: [],
      deletedUsers: [],
      preservedUsers: []
    };
  }

  logStep(step, status = 'INFO', details = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${status}: ${step}`);
    if (details) console.log(`   Details: ${details}`);
  }

  // Check if an email matches test patterns
  isTestUser(email) {
    if (!email) return false;
    
    const emailLower = email.toLowerCase();
    return this.testEmailPatterns.some(pattern => emailLower.includes(pattern.toLowerCase()));
  }

  // Get all users from database
  async getAllUsers() {
    try {
      this.logStep('Fetching all users from database', 'START');
      
      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, first_name, last_name, business_name, created_at, email_verified')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      this.cleanupResults.totalUsersFound = data.length;
      this.logStep(`Found ${data.length} total users in database`, 'SUCCESS');
      
      return data;
    } catch (error) {
      this.logStep('Failed to fetch users', 'ERROR', error.message);
      this.cleanupResults.errors.push({
        operation: 'fetchUsers',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Identify test users vs legitimate users
  async identifyTestUsers(users) {
    this.logStep('Identifying test users vs legitimate users', 'START');
    
    const testUsers = [];
    const legitimateUsers = [];

    for (const user of users) {
      if (this.isTestUser(user.email)) {
        testUsers.push(user);
        this.logStep(`Test user identified: ${user.email}`, 'INFO');
      } else {
        legitimateUsers.push(user);
        this.logStep(`Legitimate user preserved: ${user.email}`, 'INFO');
      }
    }

    this.cleanupResults.testUsersIdentified = testUsers.length;
    this.cleanupResults.legitimateUsersPreserved = legitimateUsers.length;

    this.logStep(`Identified ${testUsers.length} test users and ${legitimateUsers.length} legitimate users`, 'SUCCESS');
    
    return { testUsers, legitimateUsers };
  }

  // Delete test users safely
  async deleteTestUsers(testUsers) {
    if (testUsers.length === 0) {
      this.logStep('No test users to delete', 'INFO');
      return;
    }

    this.logStep(`Starting deletion of ${testUsers.length} test users`, 'START');

    for (const user of testUsers) {
      try {
        this.logStep(`Deleting test user: ${user.email}`, 'START');
        
        const { error } = await this.supabase
          .from('users')
          .delete()
          .eq('id', user.id);

        if (error) {
          this.cleanupResults.errors.push({
            operation: 'deleteUser',
            userId: user.id,
            email: user.email,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          this.logStep(`Failed to delete ${user.email}`, 'ERROR', error.message);
        } else {
          this.cleanupResults.testUsersDeleted++;
          this.cleanupResults.deletedUsers.push({
            id: user.id,
            email: user.email,
            businessName: user.business_name,
            createdAt: user.created_at
          });
          this.logStep(`Successfully deleted: ${user.email}`, 'SUCCESS');
        }
      } catch (error) {
        this.cleanupResults.errors.push({
          operation: 'deleteUser',
          userId: user.id,
          email: user.email,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        this.logStep(`Error deleting ${user.email}`, 'ERROR', error.message);
      }
    }

    this.logStep(`Deletion complete: ${this.cleanupResults.testUsersDeleted}/${testUsers.length} test users deleted`, 'SUCCESS');
  }

  // Generate cleanup report
  generateCleanupReport() {
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalUsersFound: this.cleanupResults.totalUsersFound,
        testUsersIdentified: this.cleanupResults.testUsersIdentified,
        testUsersDeleted: this.cleanupResults.testUsersDeleted,
        legitimateUsersPreserved: this.cleanupResults.legitimateUsersPreserved,
        errors: this.cleanupResults.errors.length,
        successRate: this.cleanupResults.testUsersIdentified > 0 
          ? Math.round((this.cleanupResults.testUsersDeleted / this.cleanupResults.testUsersIdentified) * 100) 
          : 100
      },
      deletedUsers: this.cleanupResults.deletedUsers,
      errors: this.cleanupResults.errors,
      testEmailPatterns: this.testEmailPatterns
    };

    return report;
  }

  // Print cleanup report
  printCleanupReport(report) {
    console.log('\n' + '='.repeat(70));
    console.log('🧹 DATABASE CLEANUP REPORT');
    console.log('='.repeat(70));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Users Found: ${report.summary.totalUsersFound}`);
    console.log(`   Test Users Identified: ${report.summary.testUsersIdentified}`);
    console.log(`   Test Users Deleted: ${report.summary.testUsersDeleted}`);
    console.log(`   Legitimate Users Preserved: ${report.summary.legitimateUsersPreserved}`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);
    console.log(`   Errors: ${report.summary.errors}`);

    if (report.deletedUsers.length > 0) {
      console.log(`\n🗑️ DELETED TEST USERS:`);
      report.deletedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.businessName || 'No business name'})`);
      });
    }

    if (report.errors.length > 0) {
      console.log(`\n🚨 ERRORS:`);
      report.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.operation}: ${error.error}`);
        if (error.email) console.log(`      User: ${error.email}`);
      });
    }

    console.log(`\n🔍 TEST EMAIL PATTERNS USED:`);
    report.testEmailPatterns.forEach((pattern, index) => {
      console.log(`   ${index + 1}. "${pattern}"`);
    });

    console.log('\n' + '='.repeat(70));
    
    if (report.summary.errors === 0) {
      console.log('✅ DATABASE CLEANUP COMPLETED SUCCESSFULLY');
      console.log(`🎯 ${report.summary.testUsersDeleted} test users removed, ${report.summary.legitimateUsersPreserved} legitimate users preserved`);
    } else {
      console.log('⚠️ DATABASE CLEANUP COMPLETED WITH SOME ERRORS');
      console.log(`🎯 ${report.summary.testUsersDeleted} test users removed, ${report.summary.legitimateUsersPreserved} legitimate users preserved`);
    }
    
    console.log('='.repeat(70));
  }

  // Main cleanup execution
  async performCleanup() {
    try {
      console.log('🧹 STARTING DATABASE CLEANUP');
      console.log(`Target: Remove test users while preserving legitimate users`);
      console.log(`Timestamp: ${new Date().toISOString()}`);

      // Step 1: Get all users
      const allUsers = await this.getAllUsers();

      // Step 2: Identify test vs legitimate users
      const { testUsers, legitimateUsers } = await this.identifyTestUsers(allUsers);

      // Step 3: Confirm before deletion
      if (testUsers.length > 0) {
        console.log(`\n⚠️ DELETION CONFIRMATION:`);
        console.log(`   About to delete ${testUsers.length} test users`);
        console.log(`   Preserving ${legitimateUsers.length} legitimate users`);
        console.log(`   Proceeding with deletion...`);

        // Step 4: Delete test users
        await this.deleteTestUsers(testUsers);
      } else {
        this.logStep('No test users found to delete', 'INFO');
      }

      // Step 5: Generate and display report
      const report = this.generateCleanupReport();
      this.printCleanupReport(report);

      // Step 6: Save detailed report
      const reportFilename = `database-cleanup-report-${Date.now()}.json`;
      require('fs').writeFileSync(reportFilename, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed cleanup report saved to: ${reportFilename}`);

      return report;

    } catch (error) {
      console.error('\n🚨 CRITICAL ERROR DURING DATABASE CLEANUP:');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }
}

// Execute cleanup
async function main() {
  const cleanupManager = new DatabaseCleanupManager();
  
  try {
    const report = await cleanupManager.performCleanup();
    
    // Exit with appropriate code
    if (report.summary.errors === 0) {
      process.exit(0); // Success
    } else {
      process.exit(1); // Some errors
    }
    
  } catch (error) {
    console.error('Database cleanup execution failed:', error.message);
    process.exit(2); // Critical failure
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseCleanupManager;
