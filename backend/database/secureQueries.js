/**
 * Simple Secure Queries
 * Replacement for the deleted secureQueries utility
 */

/**
 * User Queries - Simple wrapper around database operations
 */
class UserQueries {
  constructor() {
    // This is a simple wrapper - actual queries are handled by database-operations.js
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User object or null
   */
  async findByEmail(email) {
    const { databaseOperations } = require('./database-operations');
    const result = await databaseOperations.getUserByEmail(email);
    return result.data;
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user object
   */
  async create(userData) {
    const { databaseOperations } = require('./database-operations');
    const result = await databaseOperations.createUser(userData);
    return result.data;
  }

  /**
   * Update user by ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user object
   */
  async updateById(userId, updateData) {
    const { databaseOperations } = require('./database-operations');
    const result = await databaseOperations.updateUser(userId, updateData);
    return result.data;
  }

  /**
   * Find user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object or null
   */
  async findById(userId) {
    const { databaseOperations } = require('./database-operations');
    const result = await databaseOperations.getUserById(userId);
    return result.data;
  }

  /**
   * Delete user by ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteById(userId) {
    const { databaseOperations } = require('./database-operations');
    const result = await databaseOperations.deleteUser(userId);
    return !result.error;
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} hashedPassword - New hashed password
   * @returns {Promise<Object>} Updated user object
   */
  async updatePassword(userId, hashedPassword) {
    const { databaseOperations } = require('./database-operations');
    const result = await databaseOperations.updateUserPassword(userId, hashedPassword);
    return result.data;
  }

  /**
   * Verify user email
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user object
   */
  async verifyEmail(userId) {
    const { databaseOperations } = require('./database-operations');
    const result = await databaseOperations.verifyUserEmail(userId);
    return result.data;
  }
}

module.exports = {
  UserQueries
};
