// React import removed - not needed with new JSX transform

/**
 * Loading Spinner Component
 * Provides consistent loading states across the application
 */
const LoadingSpinner = ({
  size = 'medium',
  color = 'indigo',
  text = null,
  fullScreen = false,
  overlay = false,
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xlarge: 'h-16 w-16',
  };

  const colorClasses = {
    indigo: 'text-indigo-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
    white: 'text-white',
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl',
  };

  const spinner = (
    <div className='flex flex-col items-center justify-center space-y-3'>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
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

      {text && (
        <p className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className='fixed inset-0 bg-white flex items-center justify-center z-50'>{spinner}</div>
    );
  }

  if (overlay) {
    return (
      <div className='absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40'>
        {spinner}
      </div>
    );
  }

  return <div className='flex items-center justify-center p-4'>{spinner}</div>;
};

/**
 * Button Loading Spinner
 * For use inside buttons during form submission
 */
export const ButtonSpinner = ({ size = 'small', color = 'white' }) => (
  <svg
    className={`animate-spin ${size === 'small' ? 'h-4 w-4' : 'h-5 w-5'} ${
      color === 'white' ? 'text-white' : 'text-gray-600'
    }`}
    xmlns='http://www.w3.org/2000/svg'
    fill='none'
    viewBox='0 0 24 24'
  >
    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
    <path
      className='opacity-75'
      fill='currentColor'
      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
    />
  </svg>
);

/**
 * Skeleton Loader Component
 * For content that's loading
 */
export const SkeletonLoader = ({ lines = 3, className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <div key={index} className='space-y-3'>
        <div className='h-4 bg-gray-200 rounded w-3/4' />
        <div className='h-4 bg-gray-200 rounded w-1/2' />
        <div className='h-4 bg-gray-200 rounded w-5/6' />
      </div>
    ))}
  </div>
);

/**
 * Card Skeleton Loader
 * For loading card-like content
 */
export const CardSkeleton = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className='bg-white shadow rounded-lg p-6'>
      <div className='flex items-center space-x-4'>
        <div className='rounded-full bg-gray-200 h-10 w-10' />
        <div className='flex-1 space-y-2'>
          <div className='h-4 bg-gray-200 rounded w-3/4' />
          <div className='h-4 bg-gray-200 rounded w-1/2' />
        </div>
      </div>
      <div className='mt-4 space-y-3'>
        <div className='h-4 bg-gray-200 rounded' />
        <div className='h-4 bg-gray-200 rounded w-5/6' />
        <div className='h-4 bg-gray-200 rounded w-4/6' />
      </div>
    </div>
  </div>
);

/**
 * Page Loading Component
 * For full page loading states
 */
export const PageLoading = ({ message = 'Loading...' }) => (
  <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
    <div className='sm:mx-auto sm:w-full sm:max-w-md'>
      <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
        <LoadingSpinner size='large' text={message} />
      </div>
    </div>
  </div>
);

export default LoadingSpinner;
