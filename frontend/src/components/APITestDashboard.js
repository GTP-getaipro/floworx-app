import React, { useState, useEffect } from 'react';
import './APITestDashboard.css';

const APITestDashboard = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const apiEndpoints = [
    { name: 'Health Check', url: '/api/health', method: 'GET' },
    { name: 'Config Health', url: '/api/health/config', method: 'GET' },
    { name: 'Auth Status', url: '/api/auth/status', method: 'GET' },
    { name: 'OAuth Status', url: '/api/oauth/status', method: 'GET' },
    { name: 'Business Types', url: '/api/business-types', method: 'GET' }
  ];

  const testEndpoint = async (endpoint) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [endpoint.name]: {
          status: response.status,
          success: response.ok,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [endpoint.name]: {
          status: 'ERROR',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  const testAllEndpoints = async () => {
    setLoading(true);
    setTestResults({});
    
    for (const endpoint of apiEndpoints) {
      await testEndpoint(endpoint);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setLoading(false);
  };

  return (
    <div className="api-test-dashboard">
      <div className="dashboard-header">
        <h1>🧪 API Test Dashboard</h1>
        <p>Test and monitor API endpoints</p>
      </div>

      <div className="test-controls">
        <button 
          onClick={testAllEndpoints}
          disabled={loading}
          className="test-all-btn"
        >
          {loading ? '🔄 Testing...' : '🚀 Test All Endpoints'}
        </button>
      </div>

      <div className="endpoints-grid">
        {apiEndpoints.map((endpoint) => (
          <div key={endpoint.name} className="endpoint-card">
            <div className="endpoint-header">
              <h3>{endpoint.name}</h3>
              <span className={`method-badge ${endpoint.method.toLowerCase()}`}>
                {endpoint.method}
              </span>
            </div>
            
            <div className="endpoint-url">
              <code>{endpoint.url}</code>
            </div>

            <button 
              onClick={() => testEndpoint(endpoint)}
              disabled={loading}
              className="test-btn"
            >
              Test
            </button>

            {testResults[endpoint.name] && (
              <div className={`result ${testResults[endpoint.name].success ? 'success' : 'error'}`}>
                <div className="result-status">
                  Status: {testResults[endpoint.name].status}
                  {testResults[endpoint.name].success ? ' ✅' : ' ❌'}
                </div>
                
                <div className="result-timestamp">
                  {new Date(testResults[endpoint.name].timestamp).toLocaleTimeString()}
                </div>

                <details className="result-details">
                  <summary>Response Data</summary>
                  <pre>
                    {JSON.stringify(
                      testResults[endpoint.name].data || testResults[endpoint.name].error, 
                      null, 
                      2
                    )}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="dashboard-info">
        <h3>📊 System Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Frontend:</span>
            <span className="status-value success">✅ Running</span>
          </div>
          <div className="status-item">
            <span className="status-label">Backend:</span>
            <span className="status-value">🔄 Testing...</span>
          </div>
          <div className="status-item">
            <span className="status-label">Database:</span>
            <span className="status-value">🔄 Testing...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APITestDashboard;
