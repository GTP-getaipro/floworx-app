const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const supabaseTest = require('./supabaseTest');
const { createClient } = require('@supabase/supabase-js');

/**
 * Local test server with Supabase integration
 */
class TestServer {
  constructor(options = {}) {
    this.options = {
      port: process.env.TEST_SERVER_PORT || 5001,
      logLevel: process.env.TEST_LOG_LEVEL || 'dev',
      ...options
    };

    this.app = express();
    this.server = null;
    this.supabase = null;
  }

  /**
   * Initialize test server
   */
  async initialize() {
    console.log('Initializing test server...');

    // Initialize Supabase test environment
    await supabaseTest.initialize();

    // Create Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Set up middleware
    this.setupMiddleware();

    // Set up routes
    this.setupRoutes();

    console.log('Test server initialized successfully');
  }

  /**
   * Set up middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(morgan(this.options.logLevel));

    // Add Supabase client to requests
    this.app.use((req, res, next) => {
      req.supabase = this.supabase;
      next();
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      console.error(err);
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
        error: process.env.NODE_ENV === 'test' ? err : {}
      });
    });
  }

  /**
   * Set up test routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        environment: 'test'
      });
    });

    // Authentication endpoints
    this.app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      res.json({
        success: true,
        data: {
          user: data.user,
          token: data.session.access_token
        }
      });
    });

    // User profile endpoints
    this.app.get('/api/users/profile', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { data: { user }, error: authError } = await this.supabase.auth.getUser(token);
      
      if (authError) {
        return res.status(401).json({
          success: false,
          message: authError.message
        });
      }

      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        return res.status(500).json({
          success: false,
          message: profileError.message
        });
      }

      res.json({
        success: true,
        data: profile
      });
    });

    // Company endpoints
    this.app.get('/api/companies', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { data: { user }, error: authError } = await this.supabase.auth.getUser(token);
      
      if (authError) {
        return res.status(401).json({
          success: false,
          message: authError.message
        });
      }

      const { data: companies, error: companiesError } = await this.supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);

      if (companiesError) {
        return res.status(500).json({
          success: false,
          message: companiesError.message
        });
      }

      res.json({
        success: true,
        data: companies
      });
    });

    // Invitations endpoints
    this.app.post('/api/invitations', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { data: { user }, error: authError } = await this.supabase.auth.getUser(token);
      
      if (authError) {
        return res.status(401).json({
          success: false,
          message: authError.message
        });
      }

      const { company_id, email, role } = req.body;

      if (!company_id) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      const { data: invitation, error: inviteError } = await this.supabase
        .from('invitations')
        .insert({
          company_id,
          email,
          role,
          status: 'pending',
          created_by: user.id,
          token: require('crypto').randomBytes(32).toString('hex')
        })
        .select()
        .single();

      if (inviteError) {
        return res.status(500).json({
          success: false,
          message: inviteError.message
        });
      }

      res.json({
        success: true,
        data: invitation
      });
    });

    this.app.get('/api/companies/:companyId/invitations', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { companyId } = req.params;

      const { data: invitations, error: inviteError } = await this.supabase
        .from('invitations')
        .select('*')
        .eq('company_id', companyId);

      if (inviteError) {
        return res.status(500).json({
          success: false,
          message: inviteError.message
        });
      }

      res.json({
        success: true,
        data: invitations
      });
    });

    this.app.post('/api/invitations/:id/accept', async (req, res) => {
      const { id } = req.params;
      const { token } = req.body;

      const { data: invitation, error: inviteError } = await this.supabase
        .from('invitations')
        .select('*')
        .eq('id', id)
        .eq('token', token)
        .single();

      if (inviteError || !invitation) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }

      // Update invitation status
      const { error: updateError } = await this.supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', id);

      if (updateError) {
        return res.status(500).json({
          success: false,
          message: updateError.message
        });
      }

      res.json({
        success: true,
        data: { status: 'accepted' }
      });
    });

    this.app.delete('/api/invitations/:id', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { id } = req.params;

      const { error: deleteError } = await this.supabase
        .from('invitations')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return res.status(500).json({
          success: false,
          message: deleteError.message
        });
      }

      res.json({
        success: true
      });
    });
  }

  /**
   * Start test server
   */
  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.options.port, () => {
        console.log(`Test server running on port ${this.options.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop test server
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
      this.server = null;
    }

    // Clean up Supabase test environment
    await supabaseTest.cleanup();
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }
}

module.exports = TestServer;
