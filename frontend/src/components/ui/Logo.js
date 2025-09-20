
/**
 * Logo - FloWorx Brand Logo Component
 *
 * Displays the FloWorx logo with multiple variants, sizes, and configurations
 * for consistent branding across the application.
 *
 * @component
 * @example
 * // Basic usage
 * <Logo />
 *
 * // With specific variant and size
 * <Logo variant="transparent" size="lg" />
 *
 * // With text and custom styling
 * <Logo
 *   variant="label"
 *   size="md"
 *   config={{
 *     showText: true,
 *     className: "custom-logo-class"
 *   }}
 * />
 *
 * @param {Object} props - Component props
 * @param {string} [props.variant="icon"] - Logo variant (icon, label, transparent, whiteOnBlue, labelWithText)
 * @param {string} [props.size="md"] - Logo size (xs, sm, md, lg, xl)
 * @param {Object} [props.config] - Logo configuration object
 * @param {string} [props.config.alt="FloWorx Logo"] - Alt text for accessibility
 * @param {string} [props.config.className=""] - Additional CSS classes
 * @param {boolean} [props.config.showText=false] - Whether to show "FloWorx" text
 * @param {Object} props...props - Additional props passed to the container
 *
 * @features
 * - Multiple logo variants for different backgrounds
 * - Responsive sizing system (xs to xl)
 * - Optional text display with size-appropriate typography
 * - Accessibility support with proper alt text
 * - Flexible styling with className override
 * - Optimized image loading with proper aspect ratios
 *
 * @variants
 * - icon: Default icon-only logo
 * - label: Logo with label styling
 * - transparent: Logo with transparent background
 * - whiteOnBlue: White logo for blue backgrounds
 * - labelWithText: Logo with integrated text
 *
 * @dependencies
 * - Logo assets: Located in /public/images/logos/
 */

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
  config = {},
  // Backward compatibility - support old prop structure
  alt: legacyAlt,
  className: legacyClassName,
  showText: legacyShowText,
  ...props
}) => {
  // Extract config with defaults, supporting backward compatibility
  const {
    alt = legacyAlt || 'FloWorx Logo',
    className = legacyClassName || '',
    showText = legacyShowText !== undefined ? legacyShowText : false
  } = config;
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-12 w-12', // Standard auth header size - max-h-12 max-w-12
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

  // Logo variants using actual FloWorx logo assets
  const getLogoContent = () => {
    switch (variant) {
      case 'white-on-blue':
        // White logo on blue background - for blue headers/backgrounds
        return (
          <img
            src={logoAssets.whiteOnBlue}
            alt={alt}
            width="48"
            height="48"
            className="w-full h-full object-contain max-w-full max-h-full"
            style={{ maxWidth: '48px', maxHeight: '48px' }}
          />
        );

      case 'blue-on-white':
      case 'transparent':
        // Transparent logo - for white backgrounds
        return (
          <img
            src={logoAssets.transparent}
            alt={alt}
            width="48"
            height="48"
            className="w-full h-full object-contain max-w-full max-h-full"
            style={{ maxWidth: '48px', maxHeight: '48px' }}
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

  // The legacy props are already destructured at function level,
  // so props only contains the remaining DOM props

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
