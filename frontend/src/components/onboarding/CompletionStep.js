import { useEffect, useState } from 'react';
import './StepStyles.css';

const CompletionStep = ({ data, onComplete }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    // Auto-redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      onComplete && onComplete();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleGoToDashboard = () => {
    onComplete && onComplete();
  };

  return (
    <div className='step-content completion-content'>
      {showConfetti && <div className='confetti-animation' />}

      <div className='completion-header'>
        <div className='success-icon-large'>🎉</div>
        <h2>Congratulations!</h2>
        <h3>Your Email Automation is Now Active</h3>
        <p>
          Floworx is now monitoring your Gmail and will start categorizing and routing your emails
          automatically. You should see results within minutes!
        </p>
      </div>

      <div className='completion-stats'>
        <div className='stat-card'>
          <div className='stat-icon'>📧</div>
          <div className='stat-number'>{data.businessCategories?.length || 0}</div>
          <div className='stat-label'>Email Categories</div>
        </div>

        <div className='stat-card'>
          <div className='stat-icon'>🏷️</div>
          <div className='stat-number'>{data.labelMappings?.length || 0}</div>
          <div className='stat-label'>Gmail Mappings</div>
        </div>

        <div className='stat-card'>
          <div className='stat-icon'>👥</div>
          <div className='stat-number'>{data.teamMembers?.length || 0}</div>
          <div className='stat-label'>Team Members</div>
        </div>

        <div className='stat-card'>
          <div className='stat-icon'>⚡</div>
          <div className='stat-number'>5</div>
          <div className='stat-label'>Minute Intervals</div>
        </div>
      </div>

      <div className='next-steps'>
        <h4>What's Next?</h4>
        <div className='next-steps-list'>
          <div className='next-step-item'>
            <div className='step-icon'>📊</div>
            <div className='step-content'>
              <div className='step-title'>Monitor Your Dashboard</div>
              <div className='step-description'>
                Watch real-time email processing and automation activity
              </div>
            </div>
          </div>

          <div className='next-step-item'>
            <div className='step-icon'>📧</div>
            <div className='step-content'>
              <div className='step-title'>Check Your Gmail</div>
              <div className='step-description'>
                See emails being automatically labeled and organized
              </div>
            </div>
          </div>

          <div className='next-step-item'>
            <div className='step-icon'>🔔</div>
            <div className='step-content'>
              <div className='step-title'>Team Notifications</div>
              <div className='step-description'>
                Your team will start receiving relevant email alerts
              </div>
            </div>
          </div>

          <div className='next-step-item'>
            <div className='step-icon'>⚙️</div>
            <div className='step-content'>
              <div className='step-title'>Fine-tune Settings</div>
              <div className='step-description'>
                Adjust categories, mappings, and team settings as needed
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='completion-actions'>
        <button onClick={handleGoToDashboard} className='primary-button dashboard-button'>
          🚀 Go to My Dashboard
        </button>
      </div>

      <div className='completion-footer'>
        <div className='support-info'>
          <h5>Need Help?</h5>
          <p>
            Our team is here to help you get the most out of Floworx.
            <br />
            <a href='mailto:support@floworx-iq.com'>Contact Support</a> |
            <a href='https://docs.floworx-iq.com' target='_blank' rel='noopener noreferrer'>
              {' '}
              View Documentation
            </a>
          </p>
        </div>

        <div className='auto-redirect'>
          <small>You'll be automatically redirected to your dashboard in a few seconds...</small>
        </div>
      </div>
    </div>
  );
};

export default CompletionStep;
