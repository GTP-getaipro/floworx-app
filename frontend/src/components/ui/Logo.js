import React from 'react';

// FloWorx logo assets from public directory
const logoAssets = {
  label: '/images/logos/Label Logo.png',
  transparent: '/images/logos/transpoerent logo.png',
  whiteOnBlue: '/images/logos/white on a blue.png',
  labelWithText: '/images/logos/lable on transperent with word Floworx.png'
};

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
    md: 'h-10 w-10', // Reduced from h-12 w-12 for better scaling
    lg: 'h-14 w-14', // Reduced from h-16 w-16 for better scaling
    xl: 'h-18 w-18'  // Reduced from h-20 w-20 for better scaling
  };

  const textSizeClasses = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const logoClasses = `${sizeClasses[size]} ${className}`;

  // Logo variants using actual FloWorx logo assets
  const getLogoContent = () => {
    switch (variant) {
      case 'white-on-blue':
        // White logo on blue background - for blue headers/backgrounds
        return (
          <img
            src={logoAssets.whiteOnBlue}
            alt={alt}
            className="w-full h-full object-contain"
          />
        );

      case 'blue-on-white':
      case 'transparent':
        // Transparent logo - for white backgrounds
        return (
          <img
            src={logoAssets.transparent}
            alt={alt}
            className="w-full h-full object-contain"
          />
        );

      case 'transparent-with-text':
        // Logo with FloWorx text included
        return (
          <img
            src={logoAssets.labelWithText}
            alt={alt}
            className="w-full h-full object-contain"
          />
        );

      case 'label':
        // Label logo variant
        return (
          <img
            src={logoAssets.label}
            alt={alt}
            className="w-full h-full object-contain"
          />
        );

      case 'icon':
      default:
        // Default transparent logo
        return (
          <img
            src={logoAssets.transparent}
            alt={alt}
            className="w-full h-full object-contain"
          />
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
