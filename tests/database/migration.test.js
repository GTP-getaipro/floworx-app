const { Client } = require('pg');
const { readdir, readFile } = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

/**
 * Database migration test runner
 */
class MigrationTest {
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 5432,
      database: options.database || 'test_db',
      user: options.user || 'test_user',
      password: options.password || 'test_password',
      ...options
    };

    this.client = null;
    this.results = [];
  }

  /**
   * Run migration tests
   */
  async runTests() {
    console.log(chalk.blue('\nStarting migration tests...'));
    
    try {
      // Connect to test database
      await this.connect();

      // Get migration files
      const migrations = await this.getMigrationFiles();
      console.log(chalk.gray(`Found ${migrations.length} migration files\n`));

      // Test each migration
      for (const migration of migrations) {
        await this.testMigration(migration);
      }

      // Generate report
      await this.generateReport();

      return this.results;
    } catch (error) {
      console.error(chalk.red('\nMigration tests failed:'), error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Connect to test database
   */
  async connect() {
    this.client = new Client(this.options);
    await this.client.connect();
  }

  /**
   * Get migration files
   */
  async getMigrationFiles() {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = await readdir(migrationsDir);
    
    return files
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => ({
        name: file,
        path: path.join(migrationsDir, file)
      }));
  }

  /**
   * Test a single migration
   */
  async testMigration(migration) {
    console.log(chalk.cyan(`Testing migration: ${migration.name}`));
    
    const result = {
      name: migration.name,
      status: 'passed',
      errors: [],
      warnings: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Begin transaction
      await this.client.query('BEGIN');

      // Read and split migration file
      const content = await readFile(migration.path, 'utf8');
      const [upSql, downSql] = this.splitMigration(content);

      // Test up migration
      await this.testUpMigration(upSql, result);

      // Test down migration
      await this.testDownMigration(downSql, result);

      // Commit transaction
      await this.client.query('COMMIT');

      result.duration = Date.now() - startTime;
      console.log(chalk.green('✓ Migration test passed\n'));
    } catch (error) {
      // Rollback on error
      await this.client.query('ROLLBACK');
      
      result.status = 'failed';
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      
      console.log(chalk.red(`✗ Migration test failed: ${error.message}\n`));
    }

    this.results.push(result);
  }

  /**
   * Split migration into up and down parts
   */
  splitMigration(content) {
    const parts = content.split(/^-- Down/m);
    const upSql = parts[0].replace(/^-- Up/m, '').trim();
    const downSql = parts[1]?.trim() || '';
    return [upSql, downSql];
  }

  /**
   * Test up migration
   */
  async testUpMigration(sql, result) {
    // Validate SQL syntax
    const syntaxErrors = this.validateSqlSyntax(sql);
    if (syntaxErrors.length > 0) {
      result.errors.push(...syntaxErrors);
      throw new Error('SQL syntax validation failed');
    }

    // Execute up migration
    await this.client.query(sql);

    // Validate schema changes
    await this.validateSchemaChanges(result);
  }

  /**
   * Test down migration
   */
  async testDownMigration(sql, result) {
    if (!sql) {
      result.warnings.push('No down migration provided');
      return;
    }

    // Validate SQL syntax
    const syntaxErrors = this.validateSqlSyntax(sql);
    if (syntaxErrors.length > 0) {
      result.errors.push(...syntaxErrors);
      throw new Error('Down migration SQL syntax validation failed');
    }

    // Execute down migration
    await this.client.query(sql);

    // Verify schema is reverted
    await this.validateSchemaRevert(result);
  }

  /**
   * Validate SQL syntax
   */
  validateSqlSyntax(sql) {
    const errors = [];
    
    // Check for common SQL syntax issues
    if (sql.includes('--') && !sql.includes('\n')) {
      errors.push('Inline comments should be on their own line');
    }

    if (sql.includes('DROP TABLE') && !sql.includes('IF EXISTS')) {
      errors.push('DROP TABLE statements should include IF EXISTS');
    }

    if (sql.includes('CREATE TABLE') && !sql.includes('IF NOT EXISTS')) {
      errors.push('CREATE TABLE statements should include IF NOT EXISTS');
    }

    return errors;
  }

  /**
   * Validate schema changes
   */
  async validateSchemaChanges(result) {
    // Get current schema
    const { rows } = await this.client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    // Validate required columns
    const requiredColumns = ['created_at', 'updated_at'];
    const tables = [...new Set(rows.map(r => r.table_name))];

    for (const table of tables) {
      const tableColumns = rows
        .filter(r => r.table_name === table)
        .map(r => r.column_name);

      for (const column of requiredColumns) {
        if (!tableColumns.includes(column)) {
          result.warnings.push(
            `Table '${table}' is missing required column '${column}'`
          );
        }
      }
    }
  }

  /**
   * Validate schema revert
   */
  async validateSchemaRevert(result) {
    // Get current schema
    const { rows } = await this.client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);

    if (rows.length > 0) {
      result.warnings.push(
        'Down migration did not completely revert schema changes'
      );
    }
  }

  /**
   * Generate test report
   */
  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(process.cwd(), 'test-results', 'migrations');
    
    // Create report directory
    await require('fs').promises.mkdir(reportDir, { recursive: true });

    // Generate report
    const report = {
      timestamp,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        warnings: this.results.reduce((acc, r) => acc + r.warnings.length, 0)
      },
      results: this.results
    };

    // Write report to file
    const reportPath = path.join(reportDir, `migration-test-${timestamp}.json`);
    await require('fs').promises.writeFile(
      reportPath,
      JSON.stringify(report, null, 2)
    );

    // Print summary
    console.log(chalk.blue('\nMigration Test Summary'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(`Total Migrations: ${report.summary.total}`);
    console.log(`Passed: ${chalk.green(report.summary.passed)}`);
    console.log(`Failed: ${chalk.red(report.summary.failed)}`);
    console.log(`Warnings: ${chalk.yellow(report.summary.warnings)}`);
    console.log(chalk.gray('='.repeat(50)));
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.client) {
      await this.client.end();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new MigrationTest();
  test.runTests().catch(console.error);
}

module.exports = MigrationTest;
