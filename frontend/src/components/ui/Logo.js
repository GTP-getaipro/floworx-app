import React from 'react';

const Logo = ({
  variant = 'icon',
  size = 'md',
  alt = 'FloWorx Logo',
  className = '',
  showText = false,
  ...props
}) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  };

  const textSizeClasses = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const logoClasses = `${sizeClasses[size]} ${className}`;

  // Logo variants based on background context
  const getLogoContent = () => {
    switch (variant) {
      case 'white-on-blue':
        // White F on blue background - for blue headers/backgrounds
        return (
          <div className="bg-blue-600 text-white rounded-lg flex items-center justify-center w-full h-full font-bold shadow-lg">
            <span className={`${textSizeClasses[size]} font-bold`}>F</span>
          </div>
        );

      case 'blue-on-white':
        // Blue F on white/transparent - for white backgrounds
        return (
          <div className="bg-white text-blue-600 rounded-lg flex items-center justify-center w-full h-full font-bold shadow-md border border-blue-100">
            <span className={`${textSizeClasses[size]} font-bold`}>F</span>
          </div>
        );

      case 'icon':
      default:
        // Default blue F with subtle shadow
        return (
          <div className="bg-blue-600 text-white rounded-lg flex items-center justify-center w-full h-full font-bold shadow-blue-200 shadow-lg">
            <span className={`${textSizeClasses[size]} font-bold`}>F</span>
          </div>
        );
    }
  };

  return (
    <div className={`flex items-center gap-3 ${showText ? 'flex-row' : ''}`} {...props}>
      <div className={logoClasses}>
        {getLogoContent()}
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-blue-600 ${textSizeClasses[size]} leading-tight`}>
            FloWorx
          </span>
          {size !== 'xs' && size !== 'sm' && (
            <span className="text-gray-600 text-xs font-medium opacity-90">
              Email AI for Hot Tub Pros
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
