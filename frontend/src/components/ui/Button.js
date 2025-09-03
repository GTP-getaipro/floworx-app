import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-hover
    disabled:opacity-60 disabled:cursor-not-allowed
    transition-all duration-200 ease-in-out
  `;

  const variants = {
    primary: `
      bg-brand-primary text-white shadow-sm
      hover:bg-brand-primary-hover hover:shadow-md
      active:bg-brand-primary-700
      focus-visible:ring-2 focus-visible:ring-brand-primary-hover
    `,
    secondary: `
      bg-surface border border-surface-border text-ink
      hover:bg-surface-subtle hover:border-ink-sub
      active:bg-surface-border
      focus-visible:ring-2 focus-visible:ring-brand-primary-hover
    `,
    danger: `
      bg-danger text-white shadow-sm
      hover:bg-red-600 hover:shadow-md
      active:bg-red-700
      focus-visible:ring-2 focus-visible:ring-red-500
    `,
    ghost: `
      bg-transparent text-brand-primary
      hover:bg-brand-primary-50 hover:text-brand-primary-hover
      active:bg-brand-primary-100
      focus-visible:ring-2 focus-visible:ring-brand-primary-hover
    `,
    link: `
      bg-transparent text-brand-primary underline-offset-2
      hover:text-brand-primary-hover hover:underline
      active:text-brand-primary-700
      focus-visible:ring-2 focus-visible:ring-brand-primary-hover
    `,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <button type={type} disabled={disabled || loading} className={classes} {...props}>
      {loading && (
        <svg
          className='animate-spin -ml-1 mr-2 h-4 w-4'
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
      )}
      {children}
    </button>
  );
};

export default Button;
