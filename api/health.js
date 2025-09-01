import { getSupabaseClient } from './_lib/database.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    // Test Supabase connection
    const supabase = getSupabaseClient();

    // Simple query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    // RLS errors are expected for unauthenticated requests
    const databaseConnected = !error || error.message.includes('row-level security');

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: databaseConnected,
        provider: 'Supabase'
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };

    res.status(200).json(healthData);

  } catch (error) {
    console.error('Health check failed:', error);

    const healthData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        provider: 'Supabase',
        error: 'Database connection failed'
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };

    res.status(503).json(healthData);
  }
}
