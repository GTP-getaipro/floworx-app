import React from 'react';

const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };
  
  const classes = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`;
  
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

export default Badge;
