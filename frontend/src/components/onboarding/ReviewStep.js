import axios from 'axios';
import React, { useState } from 'react';
import './StepStyles.css';

const ReviewStep = ({ data, onComplete, onBack, canGoBack }) => {
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState(null);

  const handleActivate = async () => {
    try {
      setDeploying(true);
      setError(null);

      const token = localStorage.getItem('token');

      // Mark onboarding as completed
      await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/complete-onboarding`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // TODO: Deploy n8n workflow here
      // await deployWorkflow(data);

      onComplete({ workflowDeployed: true });
    } catch (error) {
      console.error('Error activating automation:', error);
      setError(error.response?.data?.message || 'Failed to activate automation');
    } finally {
      setDeploying(false);
    }
  };

  const businessCategories = data.businessCategories || [];
  const labelMappings = data.labelMappings || [];
  const teamMembers = data.teamMembers || [];

  return (
    <div className='step-content'>
      <div className='step-description'>
        <h3>Review Your Configuration</h3>
        <p>
          Everything looks great! Review your settings below and activate your email automation.
        </p>
      </div>

      <div className='review-sections'>
        <div className='review-section'>
          <div className='section-header'>
            <h4>📧 Email Categories</h4>
            <span className='section-count'>{businessCategories.length} categories</span>
          </div>
          <div className='section-content'>
            {businessCategories.map((category, index) => (
              <div key={index} className='review-item'>
                <div className='item-name'>{category.name}</div>
                <div className='item-description'>{category.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className='review-section'>
          <div className='section-header'>
            <h4>🏷️ Gmail Label Mappings</h4>
            <span className='section-count'>{labelMappings.length} mappings</span>
          </div>
          <div className='section-content'>
            {labelMappings.length === 0 ? (
              <div className='empty-review'>No label mappings configured</div>
            ) : (
              labelMappings.map((mapping, index) => (
                <div key={index} className='review-item mapping-item'>
                  <div className='mapping-flow'>
                    <span className='category-tag'>{mapping.categoryName}</span>
                    <span className='mapping-arrow'>→</span>
                    <span className='label-tag'>{mapping.gmailLabelName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='review-section'>
          <div className='section-header'>
            <h4>👥 Team Notifications</h4>
            <span className='section-count'>{teamMembers.length} members</span>
          </div>
          <div className='section-content'>
            {teamMembers.length === 0 ? (
              <div className='empty-review'>No team members configured</div>
            ) : (
              teamMembers.map((member, index) => (
                <div key={index} className='review-item team-item'>
                  <div className='member-details'>
                    <div className='member-name'>{member.name}</div>
                    <div className='member-email'>{member.email}</div>
                    <div className='member-scope'>
                      {member.categoryName
                        ? `Notified for: ${member.categoryName}`
                        : 'All categories'}
                    </div>
                  </div>
                  <div className='notification-status'>
                    {member.notificationEnabled ? (
                      <span className='status-enabled'>✓ Enabled</span>
                    ) : (
                      <span className='status-disabled'>✗ Disabled</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='automation-preview'>
          <h4>🤖 What Happens Next?</h4>
          <div className='automation-flow'>
            <div className='flow-step'>
              <div className='flow-icon'>📨</div>
              <div className='flow-content'>
                <div className='flow-title'>Email Monitoring</div>
                <div className='flow-description'>
                  We'll monitor your Gmail inbox every 5 minutes
                </div>
              </div>
            </div>

            <div className='flow-arrow'>↓</div>

            <div className='flow-step'>
              <div className='flow-icon'>🧠</div>
              <div className='flow-content'>
                <div className='flow-title'>AI Classification</div>
                <div className='flow-description'>
                  Emails are automatically categorized using AI
                </div>
              </div>
            </div>

            <div className='flow-arrow'>↓</div>

            <div className='flow-step'>
              <div className='flow-icon'>🏷️</div>
              <div className='flow-content'>
                <div className='flow-title'>Auto-Labeling</div>
                <div className='flow-description'>
                  Emails are labeled according to your mappings
                </div>
              </div>
            </div>

            <div className='flow-arrow'>↓</div>

            <div className='flow-step'>
              <div className='flow-icon'>🔔</div>
              <div className='flow-content'>
                <div className='flow-title'>Team Notifications</div>
                <div className='flow-description'>Relevant team members are notified instantly</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className='error-message'>
          <span className='error-icon'>⚠️</span>
          {error}
        </div>
      )}

      <div className='step-actions'>
        {canGoBack && (
          <button onClick={onBack} className='secondary-button' disabled={deploying}>
            Back to Edit
          </button>
        )}

        <button
          onClick={handleActivate}
          disabled={deploying}
          className='primary-button activation-button'
        >
          {deploying ? (
            <>
              <div className='button-spinner' />
              Activating Automation...
            </>
          ) : (
            <>🚀 Activate My Email Automation!</>
          )}
        </button>
      </div>

      <div className='activation-note'>
        <div className='note-icon'>💡</div>
        <div className='note-content'>
          <strong>Ready to go live?</strong> Once activated, your email automation will start
          working immediately. You can always modify these settings later from your dashboard.
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;
