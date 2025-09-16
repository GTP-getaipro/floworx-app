/**
 * Client Dashboard Components
 * React components for post-deployment management
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Modal, Form, Badge } from 'react-bootstrap';

// Main Dashboard Overview
export const ClientDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/client-dashboard/overview', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading your automation dashboard...</div>;
  if (!dashboardData?.success) return <div>Error loading dashboard</div>;

  return (
    <div className="client-dashboard">
      <h1>FloWorx Automation Dashboard</h1>
      <p>Welcome back, {dashboardData.user.name}!</p>
      
      <div className="row">
        <div className="col-md-8">
          <AutomationStatusCard automation={dashboardData.automation} />
          <PerformanceMetricsCard metrics={dashboardData.metrics} />
        </div>
        <div className="col-md-4">
          <QuickActionsCard 
            canRedeploy={dashboardData.canRedeploy}
            onRedeploy={loadDashboardData}
          />
          <ConfigurationSummaryCard config={dashboardData.configuration} />
        </div>
      </div>
    </div>
  );
};

// Automation Status Card
const AutomationStatusCard = ({ automation }) => {
  const getStatusColor = (status) => {
    const colors = {
      'active': 'success',
      'waiting': 'warning',
      'inactive': 'danger',
      'auth_expired': 'warning'
    };
    return colors[status] || 'secondary';
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>🤖 Automation Status</h5>
      </Card.Header>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <Badge bg={getStatusColor(automation.status)} className="mb-2">
              {automation.status.toUpperCase().replace('_', ' ')}
            </Badge>
            <p className="mb-0">{automation.message}</p>
            <small className="text-muted">
              Deployed: {new Date(automation.deployedAt).toLocaleDateString()}
            </small>
          </div>
          <div className="text-end">
            <div className="automation-icon">
              {automation.status === 'active' ? '✅' : '⏳'}
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

// Performance Metrics Card
const PerformanceMetricsCard = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>📊 Performance Metrics (Last 30 Days)</h5>
      </Card.Header>
      <Card.Body>
        <div className="row text-center">
          <div className="col-3">
            <div className="metric-value">{metrics.emailProcessing.totalEmailsProcessed}</div>
            <div className="metric-label">Emails Processed</div>
          </div>
          <div className="col-3">
            <div className="metric-value">{metrics.emailProcessing.totalLabelsApplied}</div>
            <div className="metric-label">Labels Applied</div>
          </div>
          <div className="col-3">
            <div className="metric-value">{metrics.emailProcessing.totalDraftsCreated}</div>
            <div className="metric-label">Drafts Created</div>
          </div>
          <div className="col-3">
            <div className="metric-value">{metrics.executions.successRate}%</div>
            <div className="metric-label">Success Rate</div>
          </div>
        </div>
        
        <div className="mt-3">
          <small className="text-muted">
            Average: {metrics.emailProcessing.averageEmailsPerDay} emails per day
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

// Quick Actions Card
const QuickActionsCard = ({ canRedeploy, onRedeploy }) => {
  const [showRedeployModal, setShowRedeployModal] = useState(false);

  return (
    <>
      <Card className="mb-4">
        <Card.Header>
          <h5>⚡ Quick Actions</h5>
        </Card.Header>
        <Card.Body>
          <div className="d-grid gap-2">
            <Button variant="primary" href="/dashboard/settings">
              ⚙️ Manage Settings
            </Button>
            <Button 
              variant="warning" 
              disabled={!canRedeploy}
              onClick={() => setShowRedeployModal(true)}
            >
              🔄 Redeploy Automation
            </Button>
            <Button variant="outline-secondary" href="/dashboard/metrics">
              📈 View Detailed Metrics
            </Button>
            <Button variant="outline-info" href="/automation-status">
              🔍 Live Status Page
            </Button>
          </div>
        </Card.Body>
      </Card>

      <RedeploymentModal 
        show={showRedeployModal}
        onHide={() => setShowRedeployModal(false)}
        onSuccess={onRedeploy}
      />
    </>
  );
};

// Configuration Summary Card
const ConfigurationSummaryCard = ({ config }) => {
  if (!config) return null;

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>📋 Current Configuration</h5>
      </Card.Header>
      <Card.Body>
        <div className="config-summary">
          <div className="config-item">
            <strong>Business:</strong> {config.businessInfo.name}
          </div>
          <div className="config-item">
            <strong>Managers:</strong> {config.managers.length}
          </div>
          <div className="config-item">
            <strong>Suppliers:</strong> {config.suppliers.length}
          </div>
          <div className="config-item">
            <strong>Email Categories:</strong> {config.emailCategories.length}
          </div>
        </div>
        
        <div className="mt-3">
          <Button variant="outline-primary" size="sm" href="/dashboard/settings">
            Edit Configuration
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

// Redeployment Modal
const RedeploymentModal = ({ show, onHide, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      loadRedeploymentPreview();
    }
  }, [show]);

  const loadRedeploymentPreview = async () => {
    try {
      const response = await fetch('/api/client-dashboard/redeployment-preview', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setPreview(data.preview);
    } catch (error) {
      setError('Failed to load redeployment preview');
    }
  };

  const handleRedeploy = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/client-dashboard/redeploy-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ confirmRedeployment: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onSuccess();
        onHide();
      } else {
        setError(data.message || 'Redeployment failed');
      }
    } catch (error) {
      setError('Redeployment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>🔄 Redeploy Automation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        {preview && (
          <div>
            <h6>Redeployment Preview</h6>
            
            {preview.hasChanges ? (
              <div>
                <Alert variant="info">
                  Your automation will be updated with the following changes:
                </Alert>
                
                {preview.changes.map((change, index) => (
                  <div key={index} className="change-item mb-2">
                    <strong>{change.field}:</strong> {change.current} → {change.pending}
                    <br />
                    <small className="text-muted">{change.impact}</small>
                  </div>
                ))}
                
                <Alert variant="warning">
                  <strong>Estimated downtime:</strong> {preview.estimatedDowntime}
                </Alert>
              </div>
            ) : (
              <Alert variant="success">
                No changes detected. Your automation is up to date.
              </Alert>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleRedeploy}
          disabled={loading || !preview?.hasChanges}
        >
          {loading ? 'Redeploying...' : 'Confirm Redeployment'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ClientDashboard;
