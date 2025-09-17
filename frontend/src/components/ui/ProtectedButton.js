import React, { useState } from 'react';
import Button from './Button';

const ProtectedButton = ({
  children,
  onClick,
  confirmText = 'Are you sure?',
  requireConfirmation = false,
  disabled = false,
  loading = false,
  variant = 'primary',
  ...props
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async (e) => {
    if (requireConfirmation && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    if (onClick) {
      setIsProcessing(true);
      try {
        await onClick(e);
      } catch (error) {
        console.error('Protected button action failed:', error);
      } finally {
        setIsProcessing(false);
        setShowConfirmation(false);
      }
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  if (showConfirmation) {
    return (
      <div className="protected-button-confirmation">
        <div className="confirmation-message">
          {confirmText}
        </div>
        <div className="confirmation-actions">
          <Button
            variant="danger"
            size="small"
            onClick={handleClick}
            loading={isProcessing}
          >
            Confirm
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>

        <style jsx>{`
          .protected-button-confirmation {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 0.5rem;
          }

          .confirmation-message {
            font-size: 0.875rem;
            color: #991b1b;
            text-align: center;
          }

          .confirmation-actions {
            display: flex;
            gap: 0.5rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      loading={loading || isProcessing}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ProtectedButton;
