import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useErrorReporting } from './ErrorBoundary';
import './WorkflowDeployment.css';

const WorkflowDeployment = ({ onComplete, onboardingData }) => {
  const [deploymentStatus, setDeploymentStatus] = useState('preparing'); // preparing, deploying, testing, activating, completed, error
  const [deploymentResult, setDeploymentResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState([]);
  const [canRetry, setCanRetry] = useState(false);
  const { reportError } = useErrorReporting();

  const deploymentSteps = [
    { id: 'health-check', name: 'Checking n8n Service', description: 'Verifying automation service availability' },
    { id: 'create-workflow', name: 'Creating Workflow', description: 'Building your custom email automation' },
    { id: 'test-workflow', name: 'Testing Workflow', description: 'Validating automation logic' },
    { id: 'activate-workflow', name: 'Activating Workflow', description: 'Making your automation live' },
    { id: 'finalize', name: 'Finalizing Setup', description: 'Completing deployment process' }
  ];

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  }, []);

  const updateProgress = useCallback((stepIndex, stepName) => {
    const progressPercent = ((stepIndex + 1) / deploymentSteps.length) * 100;
    setProgress(progressPercent);
    setCurrentStep(stepName);
    addLog(`${stepName}...`, 'info');
  }, [deploymentSteps.length, addLog]);

  const startDeployment = useCallback(async () => {
    try {
      setDeploymentStatus('deploying');
      setError(null);
      setCanRetry(false);
      addLog('Starting workflow deployment...', 'info');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Step 1: Health Check
      updateProgress(0, 'Checking n8n Service');
      const healthResponse = await axios.get(`${process.env.REACT_APP_API_URL}/workflows/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!healthResponse.data.n8n.connected) {
        throw new Error(`n8n service unavailable: ${healthResponse.data.n8n.error}`);
      }

      addLog(`✓ n8n service is healthy (${healthResponse.data.n8n.workflowCount} workflows)`, 'success');

      // Step 2: Deploy Workflow
      updateProgress(1, 'Creating Workflow');
      const deployResponse = await axios.post(`${process.env.REACT_APP_API_URL}/workflows/deploy`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const deployment = deployResponse.data.deployment;
      addLog(`✓ Workflow created: ${deployment.workflowName}`, 'success');
      addLog(`✓ Workflow ID: ${deployment.workflowId}`, 'info');

      // Step 3: Test Workflow
      updateProgress(2, 'Testing Workflow');
      if (deployment.testExecution) {
        addLog(`✓ Test execution completed: ${deployment.testExecution.status}`, 'success');
      }

      // Step 4: Activation (already done in deployment)
      updateProgress(3, 'Activating Workflow');
      addLog(`✓ Workflow activated and ready to process emails`, 'success');

      // Step 5: Finalize
      updateProgress(4, 'Finalizing Setup');
      addLog(`✓ Webhook URL: ${deployment.webhookUrl}`, 'info');
      addLog(`✓ Deployment completed successfully!`, 'success');

      setDeploymentResult(deployment);
      setDeploymentStatus('completed');
      setProgress(100);

      // Complete onboarding after a short delay
      setTimeout(() => {
        onComplete && onComplete(deployment);
      }, 2000);

    } catch (error) {
      console.error('Deployment error:', error);
      await reportError(error, { context: 'workflowDeployment', onboardingData });
      
      setError(error.response?.data?.message || error.message);
      setDeploymentStatus('error');
      setCanRetry(error.response?.data?.canRetry !== false);
      addLog(`✗ Deployment failed: ${error.response?.data?.message || error.message}`, 'error');
    }
  }, [setDeploymentStatus, setError, setCanRetry, addLog, updateProgress, setDeploymentResult, setProgress, onComplete, reportError, onboardingData]);

  useEffect(() => {
    // Auto-start deployment when component mounts
    if (deploymentStatus === 'preparing') {
      startDeployment();
    }
  }, [deploymentStatus, startDeployment]);

  const retryDeployment = () => {
    setLogs([]);
    setProgress(0);
    setCurrentStep('');
    setDeploymentStatus('preparing');
    // Will auto-start due to useEffect
  };

  const renderDeploymentProgress = () => {
    return (
      <div className="deployment-progress">
        <div className="progress-header">
          <h3>Deploying Your Email Automation</h3>
          <div className="progress-percentage">{Math.round(progress)}%</div>
        </div>

        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="deployment-steps">
          {deploymentSteps.map((step, index) => {
            const isCompleted = progress > (index / deploymentSteps.length) * 100;
            const isActive = currentStep === step.name;
            
            return (
              <div 
                key={step.id}
                className={`deployment-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
              >
                <div className="step-indicator">
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className="step-content">
                  <div className="step-name">{step.name}</div>
                  <div className="step-description">{step.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {currentStep && (
          <div className="current-step">
            <div className="step-spinner"></div>
            <span>{currentStep}</span>
          </div>
        )}
      </div>
    );
  };

  const renderDeploymentLogs = () => {
    return (
      <div className="deployment-logs">
        <h4>Deployment Log</h4>
        <div className="logs-container">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.type}`}>
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSuccess = () => {
    return (
      <div className="deployment-success">
        <div className="success-icon">🎉</div>
        <h2>Your Email Automation is Live!</h2>
        <p>Congratulations! Your intelligent email automation has been successfully deployed and is now actively monitoring your Gmail inbox.</p>

        <div className="deployment-details">
          <h3>Deployment Summary</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Workflow Name:</label>
              <span>{deploymentResult?.workflowName}</span>
            </div>
            <div className="detail-item">
              <label>Workflow ID:</label>
              <span>{deploymentResult?.workflowId}</span>
            </div>
            <div className="detail-item">
              <label>Status:</label>
              <span className="status-active">Active</span>
            </div>
            <div className="detail-item">
              <label>Categories:</label>
              <span>{onboardingData?.businessCategories?.length || 0} configured</span>
            </div>
          </div>
        </div>

        <div className="next-steps">
          <h3>What happens next?</h3>
          <ul>
            <li>📧 Your emails will be automatically categorized as they arrive</li>
            <li>🏷️ Gmail labels will be applied based on your configuration</li>
            <li>👥 Team members will be notified for relevant emails</li>
            <li>📊 You can monitor performance in your dashboard</li>
          </ul>
        </div>

        <div className="success-actions">
          <button 
            onClick={() => onComplete && onComplete(deploymentResult)}
            className="complete-button"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  };

  const renderError = () => {
    return (
      <div className="deployment-error">
        <div className="error-icon">⚠️</div>
        <h2>Deployment Failed</h2>
        <p>We encountered an issue while deploying your email automation. Don't worry - we can try again!</p>

        <div className="error-details">
          <h3>Error Details</h3>
          <div className="error-message">{error}</div>
        </div>

        <div className="error-actions">
          {canRetry && (
            <button 
              onClick={retryDeployment}
              className="retry-button"
            >
              Try Again
            </button>
          )}
          
          <button 
            onClick={() => window.location.href = 'mailto:support@floworx-iq.com?subject=Deployment%20Failed'}
            className="support-button"
          >
            Contact Support
          </button>
        </div>

        <div className="troubleshooting">
          <h4>Common Solutions</h4>
          <ul>
            <li>Check your internet connection and try again</li>
            <li>Ensure your Google account is still connected</li>
            <li>Verify your onboarding configuration is complete</li>
            <li>Contact support if the problem persists</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="workflow-deployment">
      <div className="deployment-container">
        {deploymentStatus === 'completed' && renderSuccess()}
        {deploymentStatus === 'error' && renderError()}
        {['preparing', 'deploying'].includes(deploymentStatus) && (
          <>
            {renderDeploymentProgress()}
            {logs.length > 0 && renderDeploymentLogs()}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowDeployment;
