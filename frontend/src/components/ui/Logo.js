import React from 'react';

const Logo = ({ size = 'medium', variant = 'full', className = '' }) => {
  const sizeClasses = {
    small: 'h-8 w-auto',
    medium: 'h-12 w-auto',
    large: 'h-16 w-auto',
    xlarge: 'h-24 w-auto'
  };

  const logoText = variant === 'short' ? 'FW' : 'FloWorx';

  return (
    <div className={`logo-container ${className}`}>
      {variant === 'icon' ? (
        <div className={`logo-icon ${sizeClasses[size]}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" />
            <path
              d="M30 35 L45 35 L45 40 L35 40 L35 50 L42 50 L42 55 L35 55 L35 65 L30 65 Z"
              fill="white"
            />
            <path
              d="M55 35 L70 35 L70 65 L65 65 L65 55 L60 55 L60 65 L55 65 L55 60 L60 60 L60 40 L55 40 Z"
              fill="white"
            />
          </svg>
        </div>
      ) : (
        <div className={`logo-text ${sizeClasses[size]} flex items-center`}>
          <div className="logo-icon-small mr-2">
            <svg viewBox="0 0 100 100" className="w-8 h-8">
              <defs>
                <linearGradient id="logoGradientSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="url(#logoGradientSmall)" />
              <path
                d="M30 35 L45 35 L45 40 L35 40 L35 50 L42 50 L42 55 L35 55 L35 65 L30 65 Z"
                fill="white"
              />
              <path
                d="M55 35 L70 35 L70 65 L65 65 L65 55 L60 55 L60 65 L55 65 L55 60 L60 60 L60 40 L55 40 Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="logo-text-content font-bold text-gray-800">
            {logoText}
          </span>
        </div>
      )}

      <style jsx>{`
        .logo-container {
          display: inline-flex;
          align-items: center;
          user-select: none;
        }

        .logo-text-content {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          letter-spacing: -0.02em;
        }

        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-text {
          display: flex;
          align-items: center;
        }

        /* Size variations */
        .logo-container.small .logo-text-content {
          font-size: 1.25rem;
        }

        .logo-container.medium .logo-text-content {
          font-size: 1.5rem;
        }

        .logo-container.large .logo-text-content {
          font-size: 2rem;
        }

        .logo-container.xlarge .logo-text-content {
          font-size: 2.5rem;
        }

        /* Hover effect */
        .logo-container:hover {
          transform: scale(1.02);
          transition: transform 0.2s ease;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .logo-text-content {
            color: #f8fafc;
          }
        }
      `}</style>
    </div>
  );
};

export default Logo;
