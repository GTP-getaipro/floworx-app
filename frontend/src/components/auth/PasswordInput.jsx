import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * PasswordInput - Secure Password Input Component
 *
 * Enhanced password input with show/hide toggle functionality,
 * validation states, and accessibility features.
 *
 * @component
 * @example
 * // Basic usage
 * <PasswordInput
 *   id="password"
 *   label="Password"
 *   value={password}
 *   onChange={handlePasswordChange}
 * />
 *
 * // With validation error and configuration
 * <PasswordInput
 *   id="confirm-password"
 *   label="Confirm Password"
 *   value={confirmPassword}
 *   onChange={handleConfirmChange}
 *   config={{
 *     error: "Passwords do not match",
 *     placeholder: "Confirm your password"
 *   }}
 * />
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Unique identifier for the input
 * @param {string} [props.label] - Label text for the input
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Change handler function
 * @param {Object} [props.config] - Input configuration object
 * @param {Function} [props.config.onBlur] - Blur handler function
 * @param {string} [props.config.error] - Error message to display
 * @param {string} [props.config.placeholder] - Placeholder text
 * @param {Object} props...props - Additional props passed to input element
 *
 * @features
 * - Password visibility toggle with eye icon
 * - Consistent styling with focus and error states
 * - Accessibility support (labels, ARIA attributes)
 * - Error message display with styling
 * - Responsive design with smooth transitions
 * - Security-focused (no autocomplete by default)
 *
 * @dependencies
 * - Lucide React: Eye and EyeOff icons
 * - Tailwind CSS: Styling and responsive design
 */
export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  config = {},
  // Backward compatibility - support old prop structure
  onBlur: legacyOnBlur,
  error: legacyError,
  placeholder: legacyPlaceholder,
  ...props
}) {
  // Extract config with defaults, supporting backward compatibility
  const {
    onBlur = legacyOnBlur,
    error = legacyError,
    placeholder = legacyPlaceholder
  } = config;
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-slate-100 text-sm font-medium"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`
            h-11 w-full rounded-xl bg-white/90 text-slate-900 placeholder-slate-400
            ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none px-3 pr-10
            transition-all duration-200
            ${error ? 'ring-2 ring-red-500' : ''}
          `}
          {...props}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {/* Error message with reserved space */}
      <div className="h-4">
        {error && (
          <p className="text-red-400 text-xs mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}
