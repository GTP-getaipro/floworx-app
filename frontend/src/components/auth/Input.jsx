import React from "react";

/**
 * Input - Form Input Component for Authentication
 *
 * Reusable input component with consistent styling, validation states,
 * and accessibility features for authentication forms.
 *
 * @component
 * @example
 * // Basic usage
 * <Input
 *   id="email"
 *   label="Email Address"
 *   type="email"
 *   value={email}
 *   onChange={handleEmailChange}
 * />
 *
 * // With error state
 * <Input
 *   id="password"
 *   label="Password"
 *   type="password"
 *   value={password}
 *   onChange={handlePasswordChange}
 *   error="Password must be at least 8 characters"
 * />
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Unique identifier for the input
 * @param {string} [props.label] - Label text for the input
 * @param {string} [props.type="text"] - Input type (text, email, password, etc.)
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Change handler function
 * @param {Function} [props.onBlur] - Blur handler function
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.placeholder] - Placeholder text
 * @param {Object} props...props - Additional props passed to input element
 *
 * @features
 * - Consistent styling with focus and error states
 * - Accessibility support (labels, ARIA attributes)
 * - Error message display with styling
 * - Responsive design
 * - Smooth transitions
 *
 * @dependencies
 * - Tailwind CSS: Styling and responsive design
 */
export default function Input({
  id,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  ...props
}) {
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
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`
          h-11 w-full rounded-xl bg-white/90 text-slate-900 placeholder-slate-400
          ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none px-3
          transition-all duration-200
          ${error ? 'ring-2 ring-red-500' : ''}
        `}
        {...props}
      />
      {/* Error message with reserved space */}
      <div className="h-4">
        {error && (
          <p className="text-red-400 text-xs mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}
