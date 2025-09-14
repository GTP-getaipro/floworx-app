
const Card = ({ children, className = '', padding = 'default', shadow = 'default', ...props }) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    default: 'shadow-card',
    lg: 'shadow-lg',
  };

  const classes = `
    bg-surface rounded-xl2 border border-surface-border
    ${paddingClasses[padding]}
    ${shadowClasses[shadow]}
    ${className}
  `
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <div className={`border-b border-surface-border pb-4 mb-4 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-ink ${className}`}>{children}</h3>
);

const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-ink-sub mt-1 ${className}`}>{children}</p>
);

const CardContent = ({ children, className = '' }) => <div className={className}>{children}</div>;

const CardFooter = ({ children, className = '' }) => (
  <div className={`border-t border-surface-border pt-4 mt-4 ${className}`}>{children}</div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
