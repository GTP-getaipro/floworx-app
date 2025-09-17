import React from 'react';

const Logo = ({ variant = 'default', size = 'md', alt = 'FloWorx Logo', className = '', ...props }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  };
  
  const classes = `${sizeClasses[size]} ${className}`;
  
  return (
    <div className={`flex items-center ${classes}`} {...props}>
      <div className="bg-blue-600 text-white rounded-lg flex items-center justify-center w-full h-full font-bold text-lg">
        F
      </div>
    </div>
  );
};

export default Logo;
