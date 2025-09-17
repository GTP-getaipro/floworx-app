import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

const Link = ({
  children,
  to,
  href,
  variant = 'default',
  size = 'medium',
  external = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
  
  const variantClasses = {
    default: 'text-blue-600 hover:text-blue-800',
    muted: 'text-gray-600 hover:text-gray-800',
    danger: 'text-red-600 hover:text-red-800',
    success: 'text-green-600 hover:text-green-800',
    underline: 'text-blue-600 hover:text-blue-800 underline',
    button: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg'
  };

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const linkClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  // External link
  if (href || external) {
    return (
      <a
        href={href || to}
        className={linkClasses}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
        {external && (
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        )}
      </a>
    );
  }

  // Internal router link
  return (
    <RouterLink
      to={to}
      className={linkClasses}
      {...props}
    >
      {children}
    </RouterLink>
  );
};

export default Link;
