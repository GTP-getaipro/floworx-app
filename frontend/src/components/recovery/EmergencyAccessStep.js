import React, { useState } from 'react';

import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Card from '../ui/Card';

const EmergencyAccessStep = ({ recoveryData, onComplete }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGrantAccess = async () => {
    if (!acknowledged) return;

    setIsSubmitting(true);
    try {
      await onComplete({ emergencyAccess: true });
    } catch (error) {
      console.error('Emergency access error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const emergencyLimitations = [
    {
      icon: '⏰',
      title: 'Time Limited',
      description: 'Access expires in 1 hour for security',
    },
    {
      icon: '🔒',
      title: 'Limited Permissions',
      description: 'Some sensitive actions are restricted',
    },
    {
      icon: '📧',
      title: 'Email Required',
      description: 'Must verify email to restore full access',
    },
    {
      icon: '🔐',
      title: 'Password Reset',
      description: 'Must reset password during this session',
    },
  ];

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4'>
          <svg
            className='w-8 h-8 text-warning'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>
        <h3 className='text-lg font-semibold text-ink mb-2'>Emergency Account Access</h3>
        <p className='text-ink-sub'>
          Grant temporary access to your account with security restrictions.
        </p>
      </div>

      <Alert variant='warning'>
        <strong>Emergency Access Notice:</strong> This will grant you temporary access to your
        account with limited functionality. You must complete full account recovery to restore
        normal access.
      </Alert>

      <Card>
        <Card.Header>
          <Card.Title className='text-base'>Access Limitations</Card.Title>
          <Card.Description>
            Emergency access comes with the following restrictions for your security:
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className='grid gap-4 sm:grid-cols-2'>
            {emergencyLimitations.map((limitation, index) => (
              <div key={index} className='flex items-start space-x-3'>
                <div className='flex-shrink-0 w-8 h-8 bg-surface-subtle rounded-lg flex items-center justify-center text-lg'>
                  {limitation.icon}
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-medium text-ink'>{limitation.title}</h4>
                  <p className='text-xs text-ink-sub mt-1'>{limitation.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title className='text-base'>What You Can Do</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className='space-y-3'>
            <div className='flex items-center space-x-3'>
              <div className='w-2 h-2 bg-success rounded-full' />
              <span className='text-sm text-ink'>
                View your dashboard and basic account information
              </span>
            </div>
            <div className='flex items-center space-x-3'>
              <div className='w-2 h-2 bg-success rounded-full' />
              <span className='text-sm text-ink'>
                Access your email automation settings (read-only)
              </span>
            </div>
            <div className='flex items-center space-x-3'>
              <div className='w-2 h-2 bg-success rounded-full' />
              <span className='text-sm text-ink'>
                Reset your password and update security settings
              </span>
            </div>
            <div className='flex items-center space-x-3'>
              <div className='w-2 h-2 bg-success rounded-full' />
              <span className='text-sm text-ink'>Download your data and account information</span>
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title className='text-base'>What You Cannot Do</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className='space-y-3'>
            <div className='flex items-center space-x-3'>
              <div className='w-2 h-2 bg-danger rounded-full' />
              <span className='text-sm text-ink'>Modify email automation workflows</span>
            </div>
            <div className='flex items-center space-x-3'>
              <div className='w-2 h-2 bg-danger rounded-full' />
              <span className='text-sm text-ink'>Connect or disconnect Google accounts</span>
            </div>
            <div className='flex items-center space-x-3'>
              <div className='w-2 h-2 bg-danger rounded-full' />
              <span className='text-sm text-ink'>Access billing and subscription settings</span>
            </div>
            <div className='flex items-center space-x-3'>
              <div className='w-2 h-2 bg-danger rounded-full' />
              <span className='text-sm text-ink'>Delete your account or sensitive data</span>
            </div>
          </div>
        </Card.Content>
      </Card>

      <div className='bg-surface-subtle rounded-lg p-4'>
        <label className='flex items-start space-x-3 cursor-pointer'>
          <input
            type='checkbox'
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
            className='mt-1 h-4 w-4 text-brand-primary focus:ring-brand-primary border-surface-border rounded'
          />
          <div className='flex-1'>
            <span className='text-sm font-medium text-ink'>
              I understand the limitations of emergency access
            </span>
            <p className='text-xs text-ink-sub mt-1'>
              I acknowledge that this is temporary access with restricted functionality, and I must
              complete full account recovery to restore normal access to my FloWorx account.
            </p>
          </div>
        </label>
      </div>

      <div className='flex justify-end space-x-3 pt-4'>
        <Button
          onClick={handleGrantAccess}
          variant='primary'
          loading={isSubmitting}
          disabled={!acknowledged}
        >
          Grant Emergency Access
        </Button>
      </div>

      {!acknowledged && (
        <p className='text-sm text-ink-sub text-center'>
          Please acknowledge the limitations to proceed with emergency access.
        </p>
      )}
    </div>
  );
};

export default EmergencyAccessStep;
