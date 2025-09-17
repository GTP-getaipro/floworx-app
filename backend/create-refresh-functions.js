const { databaseOperations } = require('./database/database-operations');

async function createRefreshFunctions() {
  try {
    console.log('🔄 Creating refresh token functions...');
    
    // Initialize database connection
    await databaseOperations._ensureInitialized();
    
    if (databaseOperations.dbManager.client) {
      // Direct PostgreSQL connection - create functions
      const createFunctionSQL = `
        -- Function to create refresh token
        CREATE OR REPLACE FUNCTION create_refresh_token(
          p_user_id UUID,
          p_token_hash VARCHAR(64),
          p_expires_at TIMESTAMP WITH TIME ZONE
        ) RETURNS BOOLEAN AS $$
        BEGIN
          INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at, used_at)
          VALUES (p_user_id, p_token_hash, p_expires_at, NOW(), NULL)
          ON CONFLICT (token_hash) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            expires_at = EXCLUDED.expires_at,
            created_at = EXCLUDED.created_at,
            used_at = NULL;
          RETURN TRUE;
        EXCEPTION
          WHEN OTHERS THEN
            RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Function to find refresh token
        CREATE OR REPLACE FUNCTION find_refresh_token(
          p_token_hash VARCHAR(64)
        ) RETURNS TABLE(user_id UUID, used_at TIMESTAMP WITH TIME ZONE, expires_at TIMESTAMP WITH TIME ZONE) AS $$
        BEGIN
          RETURN QUERY
          SELECT rt.user_id, rt.used_at, rt.expires_at
          FROM refresh_tokens rt
          WHERE rt.token_hash = p_token_hash;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Function to revoke refresh token
        CREATE OR REPLACE FUNCTION revoke_refresh_token(
          p_token_hash VARCHAR(64)
        ) RETURNS BOOLEAN AS $$
        BEGIN
          UPDATE refresh_tokens 
          SET used_at = NOW() 
          WHERE token_hash = p_token_hash;
          RETURN TRUE;
        EXCEPTION
          WHEN OTHERS THEN
            RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      await databaseOperations.dbManager.client.query(createFunctionSQL);
      console.log('✅ Functions created successfully via PostgreSQL');
    } else {
      console.log('❌ No direct PostgreSQL connection available');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Function creation failed:', error);
    process.exit(1);
  }
}

createRefreshFunctions();
