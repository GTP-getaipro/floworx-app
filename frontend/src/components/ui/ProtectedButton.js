import React, { useState, useRef } from 'react';
import Button from './Button';

const ProtectedButton = ({
  onClick,
  disabled = false,
  debounceMs = 1000,
  showLoadingState = true,
  loadingText = 'Processing...',
  forceLoading = false, // External loading state
  children,
  ...props
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const lastClickTime = useRef(0);
  const processingTimeout = useRef(null);

  const handleClick = async e => {
    const now = Date.now();

    // For submit buttons with no onClick handler, allow natural form submission
    const isSubmitButton = props.type === 'submit';
    const onClickString = onClick ? onClick.toString().replace(/\s+/g, '') : '';
    const hasOnClickHandler = onClick && typeof onClick === 'function' &&
      onClickString !== '()=>{}' && onClickString !== 'function(){}' && onClickString !== '()=>undefined';

    // Button click handling

    if (isSubmitButton && !hasOnClickHandler) {
      // Allow natural form submission for submit buttons
      // Don't prevent default, let the form handle submission
      return;
    }

    // Prevent rapid clicks
    if (now - lastClickTime.current < debounceMs) {
      e.preventDefault();
      return;
    }

    // Prevent multiple clicks while processing
    if (isProcessing) {
      e.preventDefault();
      return;
    }

    lastClickTime.current = now;
    setClickCount(prev => prev + 1);
    setIsProcessing(true);

    try {
      // Show loading state
      if (showLoadingState) {
        // Minimum loading time for better UX
        const minLoadingTime = 500;
        const startTime = Date.now();

        await onClick(e);

        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < minLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
        }
      } else {
        await onClick(e);
      }
    } catch (error) {
      // Log error for debugging
      console.error('Button click error:', error);
    } finally {
      // Clear processing state after debounce period
      processingTimeout.current = setTimeout(() => {
        setIsProcessing(false);
      }, debounceMs);
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
      }
    };
  }, []);

  const isDisabled = disabled || isProcessing || forceLoading;
  const isLoading = isProcessing || forceLoading;

  return (
    <div className='relative'>
      <Button
        {...props}
        onClick={handleClick}
        disabled={isDisabled}
        className={`${props.className || ''} ${isLoading ? 'cursor-not-allowed' : ''}`}
      >
        {isLoading && showLoadingState ? (
          <div className='flex items-center justify-center'>
            <svg
              className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
            >
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'
              />
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
              />
            </svg>
            {loadingText}
          </div>
        ) : (
          children
        )}
      </Button>

      {/* Click counter for debugging (remove in production) */}
      {process.env.NODE_ENV === 'development' && clickCount > 1 && (
        <div className='absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
          {clickCount}
        </div>
      )}
    </div>
  );
};

export default ProtectedButton;
