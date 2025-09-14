import { Link as RouterLink } from 'react-router-dom';

const Link = ({ children, variant = 'primary', external = false, className = '', ...props }) => {
  const variants = {
    primary: `
      text-brand-primary hover:text-brand-primary-hover
      focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-hover
      underline-offset-2 hover:underline
    `,
    secondary: `
      text-ink-sub hover:text-ink
      focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-hover
      underline-offset-2 hover:underline
    `,
    muted: `
      text-ink-muted hover:text-ink-sub
      focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-hover
      underline-offset-2 hover:underline
    `,
    danger: `
      text-danger hover:text-red-600
      focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
      underline-offset-2 hover:underline
    `,
  };

  const classes = `
    transition-colors duration-200 rounded-sm
    ${variants[variant]}
    ${className}
  `
    .replace(/\s+/g, ' ')
    .trim();

  if (external) {
    return (
      <a className={classes} target='_blank' rel='noopener noreferrer' {...props}>
        {children}
        <svg className='inline w-4 h-4 ml-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
          />
        </svg>
      </a>
    );
  }

  return (
    <RouterLink className={classes} {...props}>
      {children}
    </RouterLink>
  );
};

export default Link;
