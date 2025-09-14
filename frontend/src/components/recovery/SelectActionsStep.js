import { useState } from 'react';

import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Card from '../ui/Card';

const SelectActionsStep = ({ recoveryData, onComplete }) => {
  const [selectedActions, setSelectedActions] = useState({
    resetPassword: false,
    regenerateBackupCodes: false,
    revokeAllSessions: true, // Default to true for security
    enableTwoFactor: false,
  });

  const handleActionToggle = action => {
    setSelectedActions(prev => ({
      ...prev,
      [action]: !prev[action],
    }));
  };

  const handleContinue = () => {
    onComplete(selectedActions);
  };

  const recoveryOptions = [
    {
      id: 'resetPassword',
      title: 'Reset Password',
      description: 'Create a new password for your account',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
          />
        </svg>
      ),
      recommended: true,
    },
    {
      id: 'regenerateBackupCodes',
      title: 'Generate New Backup Codes',
      description: 'Create new backup codes for future account recovery',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          />
        </svg>
      ),
      recommended: true,
    },
    {
      id: 'revokeAllSessions',
      title: 'Sign Out All Devices',
      description: 'End all active sessions on other devices for security',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
          />
        </svg>
      ),
      recommended: true,
      locked: true, // Always enabled for security
    },
    {
      id: 'enableTwoFactor',
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
          />
        </svg>
      ),
      recommended: false,
    },
  ];

  const hasSelectedActions = Object.values(selectedActions).some(action => action);

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='w-16 h-16 bg-brand-primary-50 rounded-full flex items-center justify-center mx-auto mb-4'>
          <svg
            className='w-8 h-8 text-brand-primary'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
            />
          </svg>
        </div>
        <h3 className='text-lg font-semibold text-ink mb-2'>Choose Recovery Actions</h3>
        <p className='text-ink-sub'>
          Select the security actions you'd like to perform during account recovery.
        </p>
      </div>

      <Alert variant='info'>
        <strong>Recommended:</strong> We suggest enabling all recommended options to ensure your
        account is fully secured.
      </Alert>

      <div className='space-y-3'>
        {recoveryOptions.map(option => (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all duration-200 ${
              selectedActions[option.id]
                ? 'ring-2 ring-brand-primary border-brand-primary bg-brand-primary-50'
                : 'hover:border-brand-primary-200'
            } ${option.locked ? 'opacity-75' : ''}`}
            onClick={() => !option.locked && handleActionToggle(option.id)}
          >
            <Card.Content className='p-4'>
              <div className='flex items-start space-x-4'>
                <div className='flex-shrink-0'>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedActions[option.id]
                        ? 'bg-brand-primary text-white'
                        : 'bg-surface-subtle text-ink-sub'
                    }`}
                  >
                    {option.icon}
                  </div>
                </div>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-2'>
                      <h4 className='text-sm font-semibold text-ink'>{option.title}</h4>
                      {option.recommended && (
                        <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success'>
                          Recommended
                        </span>
                      )}
                      {option.locked && (
                        <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning'>
                          Required
                        </span>
                      )}
                    </div>

                    <div className='flex-shrink-0'>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedActions[option.id]
                            ? 'bg-brand-primary border-brand-primary'
                            : 'border-surface-border'
                        }`}
                      >
                        {selectedActions[option.id] && (
                          <svg
                            className='w-3 h-3 text-white'
                            fill='currentColor'
                            viewBox='0 0 20 20'
                          >
                            <path
                              fillRule='evenodd'
                              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                              clipRule='evenodd'
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className='text-sm text-ink-sub mt-1'>{option.description}</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      <div className='flex justify-end space-x-3 pt-4'>
        <Button onClick={handleContinue} variant='primary' disabled={!hasSelectedActions}>
          Continue with Selected Actions
        </Button>
      </div>

      {!hasSelectedActions && (
        <p className='text-sm text-ink-sub text-center'>
          Please select at least one recovery action to continue.
        </p>
      )}
    </div>
  );
};

export default SelectActionsStep;
