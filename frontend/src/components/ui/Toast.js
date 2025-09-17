import React from 'react';

const Toast = ({ children, variant = 'info', className = '', ...props }) => {
  const variantClasses = {
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-white',
    danger: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white'
  };
  
  const classes = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${variantClasses[variant]} ${className}`;
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Toast;
