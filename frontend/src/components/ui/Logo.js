import PropTypes from 'prop-types';

// Import logo assets
import logoLabel from '../../assets/images/logos/floworx-logo-label.png';
import logoTransparentWithText from '../../assets/images/logos/floworx-logo-transparent-with-text.png';
import logoTransparent from '../../assets/images/logos/floworx-logo-transparent.png';
import logoWhiteOnBlue from '../../assets/images/logos/floworx-logo-white-on-blue.png';

/**
 * FloWorx Logo Component
 * 
 * A reusable logo component that handles different logo variants and sizes
 * with proper accessibility and responsive design.
 */
const Logo = ({
  variant = 'transparent-with-text',
  size = 'medium',
  className = '',
  alt = 'FloWorx Logo',
  onClick,
  ...props
}) => {
  // Logo variant mapping
  const logoVariants = {
    'label': logoLabel,
    'transparent-with-text': logoTransparentWithText,
    'transparent': logoTransparent,
    'white-on-blue': logoWhiteOnBlue,
  };

  // Size classes mapping
  const sizeClasses = {
    'small': 'h-8 w-auto', // 32px height
    'medium': 'h-12 w-auto', // 48px height
    'large': 'h-16 w-auto', // 64px height
    'xl': 'h-20 w-auto', // 80px height
    'header': 'h-10 w-auto sm:h-12', // Responsive header size
    'auth': 'h-16 w-auto sm:h-20', // Auth page size
    'dashboard': 'h-8 w-auto sm:h-10', // Dashboard header size
  };

  // Get the logo source
  const logoSrc = logoVariants[variant] || logoVariants['transparent-with-text'];
  
  // Get size classes
  const sizeClass = sizeClasses[size] || sizeClasses['medium'];

  // Combine classes
  const logoClasses = [
    sizeClass,
    'object-contain',
    'transition-opacity duration-200',
    onClick ? 'cursor-pointer hover:opacity-80' : '',
    className
  ].filter(Boolean).join(' ');

  // Handle click events
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  // If onClick is provided, wrap in a button for accessibility
  if (onClick) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity duration-200 ${className}`}
        aria-label={alt}
        {...props}
      >
        <img
          src={logoSrc}
          alt={alt}
          className={sizeClass + ' object-contain'}
          loading="lazy"
        />
      </button>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={logoClasses}
      loading="lazy"
      {...props}
    />
  );
};

Logo.propTypes = {
  /**
   * Logo variant to display
   */
  variant: PropTypes.oneOf([
    'label',
    'transparent-with-text',
    'transparent',
    'white-on-blue'
  ]),
  
  /**
   * Size of the logo
   */
  size: PropTypes.oneOf([
    'small',
    'medium', 
    'large',
    'xl',
    'header',
    'auth',
    'dashboard'
  ]),
  
  /**
   * Additional CSS classes
   */
  className: PropTypes.string,
  
  /**
   * Alt text for accessibility
   */
  alt: PropTypes.string,
  
  /**
   * Click handler function
   */
  onClick: PropTypes.func,
};

export default Logo;
