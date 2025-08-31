const { pool } = require('../database/connection');

class TransactionService {
  constructor() {
    this.activeTransactions = new Map();
  }

  /**
   * Start a new database transaction
   * @param {string} transactionId - Unique identifier for the transaction
   * @returns {Object} Transaction client and methods
   */
  async startTransaction(transactionId) {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');
      
      const transaction = {
        client,
        id: transactionId,
        startTime: new Date(),
        operations: [],
        status: 'active'
      };

      this.activeTransactions.set(transactionId, transaction);

      return {
        client,
        id: transactionId,
        addOperation: (operation) => this.addOperation(transactionId, operation),
        commit: () => this.commitTransaction(transactionId),
        rollback: () => this.rollbackTransaction(transactionId),
        getOperations: () => this.getOperations(transactionId)
      };

    } catch (error) {
      console.error('Failed to start transaction:', error);
      throw new Error('Unable to start database transaction');
    }
  }

  /**
   * Add an operation to the transaction log
   * @param {string} transactionId - Transaction ID
   * @param {Object} operation - Operation details
   */
  addOperation(transactionId, operation) {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      transaction.operations.push({
        ...operation,
        timestamp: new Date(),
        status: 'pending'
      });
    }
  }

  /**
   * Commit a transaction
   * @param {string} transactionId - Transaction ID
   */
  async commitTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      await transaction.client.query('COMMIT');
      transaction.status = 'committed';
      
      // Mark all operations as completed
      transaction.operations.forEach(op => {
        op.status = 'completed';
        op.completedAt = new Date();
      });

      // Log successful transaction
      console.log(`Transaction ${transactionId} committed successfully with ${transaction.operations.length} operations`);

      return {
        success: true,
        transactionId,
        operationsCount: transaction.operations.length,
        duration: new Date() - transaction.startTime
      };

    } catch (error) {
      console.error(`Failed to commit transaction ${transactionId}:`, error);
      await this.rollbackTransaction(transactionId);
      throw error;
    } finally {
      transaction.client.release();
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Rollback a transaction
   * @param {string} transactionId - Transaction ID
   */
  async rollbackTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      await transaction.client.query('ROLLBACK');
      transaction.status = 'rolled_back';
      
      // Mark all operations as failed
      transaction.operations.forEach(op => {
        op.status = 'rolled_back';
        op.rolledBackAt = new Date();
      });

      console.log(`Transaction ${transactionId} rolled back. ${transaction.operations.length} operations reversed.`);

      return {
        success: true,
        transactionId,
        operationsCount: transaction.operations.length,
        rollbackReason: 'Manual rollback or error occurred'
      };

    } catch (error) {
      console.error(`Failed to rollback transaction ${transactionId}:`, error);
      throw error;
    } finally {
      transaction.client.release();
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Get operations for a transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Array} List of operations
   */
  getOperations(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    return transaction ? transaction.operations : [];
  }

  /**
   * Get all active transactions
   * @returns {Array} List of active transactions
   */
  getActiveTransactions() {
    return Array.from(this.activeTransactions.values()).map(t => ({
      id: t.id,
      startTime: t.startTime,
      operationsCount: t.operations.length,
      status: t.status
    }));
  }

  /**
   * Clean up stale transactions (older than 30 minutes)
   */
  async cleanupStaleTransactions() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const staleTransactions = [];

    for (const [id, transaction] of this.activeTransactions.entries()) {
      if (transaction.startTime < thirtyMinutesAgo) {
        staleTransactions.push(id);
      }
    }

    for (const id of staleTransactions) {
      try {
        await this.rollbackTransaction(id);
        console.log(`Cleaned up stale transaction: ${id}`);
      } catch (error) {
        console.error(`Failed to cleanup stale transaction ${id}:`, error);
      }
    }

    return staleTransactions.length;
  }

  /**
   * Execute multiple operations in a single transaction
   * @param {string} transactionId - Transaction ID
   * @param {Array} operations - Array of operations to execute
   * @returns {Object} Execution result
   */
  async executeOperations(transactionId, operations) {
    const transaction = await this.startTransaction(transactionId);
    const results = [];

    try {
      for (const operation of operations) {
        transaction.addOperation({
          type: operation.type,
          description: operation.description,
          query: operation.query,
          params: operation.params
        });

        const result = await transaction.client.query(operation.query, operation.params);
        results.push({
          operation: operation.type,
          success: true,
          result: result.rows,
          rowCount: result.rowCount
        });
      }

      await transaction.commit();
      
      return {
        success: true,
        transactionId,
        results,
        operationsCompleted: operations.length
      };

    } catch (error) {
      await transaction.rollback();
      
      return {
        success: false,
        transactionId,
        error: error.message,
        results,
        operationsCompleted: results.length,
        operationsFailed: operations.length - results.length
      };
    }
  }
}

// Singleton instance
const transactionService = new TransactionService();

// Cleanup stale transactions every 15 minutes
setInterval(() => {
  transactionService.cleanupStaleTransactions().catch(console.error);
}, 15 * 60 * 1000);

module.exports = transactionService;
