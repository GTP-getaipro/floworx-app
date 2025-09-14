import React, { useState, useEffect } from 'react';
import APITester from '../test-api-endpoints';
import './APITestDashboard.css';

const APITestDashboard = () => {
  const [tester] = useState(() => new APITester());
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const testCategories = [
    { id: 'all', name: 'All Tests', icon: '🧪' },
    { id: 'system', name: 'System Health', icon: '🏥' },
    { id: 'auth', name: 'Authentication', icon: '🔐' },
    { id: 'user', name: 'User Management', icon: '👤' },
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'oauth', name: 'OAuth', icon: '🔗' },
    { id: 'onboarding', name: 'Onboarding', icon: '🚀' },
    { id: 'analytics', name: 'Analytics', icon: '📈' }
  ];

  const runTests = async (category = 'all') => {
    setIsRunning(true);
    setTestResults([]);
    setSummary(null);

    try {
      let results;
      
      if (category === 'all') {
        results = await tester.runAllTests();
      } else {
        // Run specific category tests
        switch (category) {
          case 'system':
            await tester.testSystemEndpoints();
            break;
          case 'auth':
            await tester.testAuthenticationFlow();
            break;
          case 'user':
            await tester.testUserManagement();
            break;
          case 'dashboard':
            await tester.testDashboard();
            break;
          case 'oauth':
            await tester.testOAuth();
            break;
          case 'onboarding':
            await tester.testOnboarding();
            break;
          case 'analytics':
            await tester.testAnalytics();
            break;
          default:
            await tester.runAllTests();
        }
        
        results = {
          success: true,
          results: tester.results,
          summary: {
            successCount: tester.results.filter(r => r.type === 'success').length,
            errorCount: tester.results.filter(r => r.type === 'error').length
          }
        };
      }

      setTestResults(results.results || []);
      setSummary(results.summary);
      
    } catch (error) {
      console.error('Test execution error:', error);
      setTestResults([{
        timestamp: new Date().toISOString(),
        message: `Test execution failed: ${error.message}`,
        type: 'error'
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getResultClass = (type) => {
    switch (type) {
      case 'success': return 'result-success';
      case 'error': return 'result-error';
      case 'info': return 'result-info';
      default: return 'result-default';
    }
  };

  return (
    <div className="api-test-dashboard">
      <div className="test-header">
        <h1>🧪 API Endpoint Testing Dashboard</h1>
        <p>Comprehensive testing of all backend API endpoints from the frontend</p>
      </div>

      <div className="test-controls">
        <div className="category-selector">
          <label>Test Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={isRunning}
          >
            {testCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <button 
          className={`run-tests-btn ${isRunning ? 'running' : ''}`}
          onClick={() => runTests(selectedCategory)}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <div className="spinner" />
              Running Tests...
            </>
          ) : (
            <>
              🚀 Run Tests
            </>
          )}
        </button>
      </div>

      {summary && (
        <div className="test-summary">
          <div className="summary-card">
            <h3>📊 Test Summary</h3>
            <div className="summary-stats">
              <div className="stat success">
                <span className="stat-number">{summary.successCount}</span>
                <span className="stat-label">Passed</span>
              </div>
              <div className="stat error">
                <span className="stat-number">{summary.errorCount}</span>
                <span className="stat-label">Failed</span>
              </div>
              <div className="stat total">
                <span className="stat-number">{summary.successCount + summary.errorCount}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
            <div className={`overall-status ${summary.errorCount === 0 ? 'success' : 'error'}`}>
              {summary.errorCount === 0 ? '✅ All Tests Passed!' : '❌ Some Tests Failed'}
            </div>
          </div>
        </div>
      )}

      <div className="test-results">
        <div className="results-header">
          <h3>📋 Test Results</h3>
          {testResults.length > 0 && (
            <button 
              className="clear-results-btn"
              onClick={() => {
                setTestResults([]);
                setSummary(null);
              }}
            >
              🗑️ Clear Results
            </button>
          )}
        </div>

        <div className="results-container">
          {testResults.length === 0 && !isRunning && (
            <div className="no-results">
              <p>No test results yet. Click "Run Tests" to start testing API endpoints.</p>
            </div>
          )}

          {testResults.map((result, index) => (
            <div key={index} className={`result-item ${getResultClass(result.type)}`}>
              <div className="result-icon">
                {getResultIcon(result.type)}
              </div>
              <div className="result-content">
                <div className="result-message">{result.message}</div>
                <div className="result-timestamp">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isRunning && (
            <div className="result-item result-info">
              <div className="result-icon">
                <div className="spinner" />
              </div>
              <div className="result-content">
                <div className="result-message">Running tests...</div>
                <div className="result-timestamp">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="test-info">
        <h3>ℹ️ Testing Information</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🔐 Authentication Tests</h4>
            <p>Tests user registration, login, email verification, and password reset flows.</p>
          </div>
          <div className="info-card">
            <h4>👤 User Management</h4>
            <p>Tests user profile, status, and settings endpoints.</p>
          </div>
          <div className="info-card">
            <h4>📊 Dashboard</h4>
            <p>Tests dashboard data loading and user interface endpoints.</p>
          </div>
          <div className="info-card">
            <h4>🔗 OAuth Integration</h4>
            <p>Tests Google OAuth flow and external service connections.</p>
          </div>
          <div className="info-card">
            <h4>🚀 Onboarding</h4>
            <p>Tests the complete user onboarding wizard and business setup.</p>
          </div>
          <div className="info-card">
            <h4>📈 Analytics</h4>
            <p>Tests analytics data collection and reporting endpoints.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APITestDashboard;
