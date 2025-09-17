import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AccountRecoveryDashboard = () => {
  const { user } = useAuth();
  const [recoveryMethods, setRecoveryMethods] = useState([]);
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRecoveryMethods();
  }, []);

  const fetchRecoveryMethods = async () => {
    try {
      const response = await fetch('/api/recovery/methods', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRecoveryMethods(data.methods || []);
        setBackupCodes(data.backupCodes || []);
      }
    } catch (error) {
      console.error('Failed to fetch recovery methods:', error);
    }
  };

  const generateBackupCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recovery/backup-codes', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.codes);
        setMessage('New backup codes generated successfully!');
      } else {
        setMessage('Failed to generate backup codes');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floworx-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="account-recovery-dashboard">
      <div className="recovery-container">
        <div className="recovery-header">
          <h1>🔐 Account Recovery</h1>
          <p>Manage your account recovery options and backup codes</p>
        </div>

        <div className="recovery-sections">
          <section className="recovery-section">
            <h3>📱 Recovery Methods</h3>
            <div className="recovery-methods">
              {recoveryMethods.length > 0 ? (
                recoveryMethods.map((method, index) => (
                  <div key={index} className="recovery-method">
                    <div className="method-info">
                      <span className="method-type">{method.type}</span>
                      <span className="method-value">{method.value}</span>
                    </div>
                    <span className={`method-status ${method.verified ? 'verified' : 'unverified'}`}>
                      {method.verified ? '✅ Verified' : '⚠️ Unverified'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="no-methods">
                  <p>No recovery methods configured</p>
                  <button className="btn primary">Add Recovery Method</button>
                </div>
              )}
            </div>
          </section>

          <section className="recovery-section">
            <h3>🔑 Backup Codes</h3>
            <p className="section-description">
              Backup codes can be used to access your account if you lose access to your primary authentication method.
            </p>
            
            {backupCodes.length > 0 ? (
              <div className="backup-codes-section">
                <div className="backup-codes-grid">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="backup-code">
                      <code>{code}</code>
                    </div>
                  ))}
                </div>
                
                <div className="backup-codes-actions">
                  <button 
                    onClick={downloadBackupCodes}
                    className="btn secondary"
                  >
                    📥 Download Codes
                  </button>
                  <button 
                    onClick={generateBackupCodes}
                    disabled={loading}
                    className="btn primary"
                  >
                    {loading ? '⏳ Generating...' : '🔄 Generate New Codes'}
                  </button>
                </div>
                
                <div className="backup-codes-warning">
                  ⚠️ <strong>Important:</strong> Store these codes in a safe place. Each code can only be used once.
                </div>
              </div>
            ) : (
              <div className="no-backup-codes">
                <p>No backup codes generated yet</p>
                <button 
                  onClick={generateBackupCodes}
                  disabled={loading}
                  className="btn primary"
                >
                  {loading ? '⏳ Generating...' : '🔑 Generate Backup Codes'}
                </button>
              </div>
            )}
          </section>

          <section className="recovery-section">
            <h3>🚨 Emergency Access</h3>
            <p className="section-description">
              If you're locked out of your account, you can request emergency access.
            </p>
            
            <div className="emergency-actions">
              <button className="btn danger">
                🆘 Request Emergency Access
              </button>
              <button className="btn secondary">
                📧 Send Recovery Email
              </button>
            </div>
          </section>
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>

      <style jsx>{`
        .account-recovery-dashboard {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .recovery-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .recovery-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .recovery-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .recovery-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .recovery-section h3 {
          margin-bottom: 1rem;
          color: #333;
        }

        .section-description {
          color: #666;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .recovery-methods {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .recovery-method {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .method-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .method-type {
          font-weight: 500;
          color: #333;
        }

        .method-value {
          color: #666;
          font-size: 0.9rem;
        }

        .method-status.verified {
          color: #10b981;
        }

        .method-status.unverified {
          color: #f59e0b;
        }

        .backup-codes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .backup-code {
          background: #f8f9fa;
          padding: 0.5rem;
          border-radius: 4px;
          text-align: center;
          font-family: monospace;
        }

        .backup-codes-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .backup-codes-warning {
          background: #fef3cd;
          border: 1px solid #fde68a;
          color: #92400e;
          padding: 1rem;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .emergency-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn.primary {
          background: #667eea;
          color: white;
        }

        .btn.primary:hover {
          background: #5a6fd8;
        }

        .btn.secondary {
          background: #f8f9fa;
          color: #333;
          border: 1px solid #dee2e6;
        }

        .btn.secondary:hover {
          background: #e9ecef;
        }

        .btn.danger {
          background: #dc2626;
          color: white;
        }

        .btn.danger:hover {
          background: #b91c1c;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          padding: 1rem;
          border-radius: 4px;
          margin-top: 1rem;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .no-methods, .no-backup-codes {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        @media (max-width: 768px) {
          .account-recovery-dashboard {
            padding: 1rem;
          }
          
          .backup-codes-actions, .emergency-actions {
            flex-direction: column;
          }
          
          .backup-codes-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AccountRecoveryDashboard;
