import React from "react";

/**
 * Input - UI Input Component (Alternative Version)
 *
 * Alternative input component with different styling approach
 * for specific UI contexts and form layouts.
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
 *   id="username"
 *   label="Username"
 *   value={username}
 *   onChange={handleUsernameChange}
 *   error="Username is already taken"
 * />
 *
 * @param {Object} props - Component props
 * @param {string} [props.label] - Label text for the input
 * @param {string} props.id - Unique identifier for the input
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.type] - Input type (text, email, password, etc.)
 * @param {string} [props.value] - Current input value
 * @param {Function} [props.onChange] - Change handler function
 * @param {Object} props...props - Additional props passed to input element
 *
 * @features
 * - Clean field-based layout structure
 * - Accessibility support (labels, ARIA attributes)
 * - Error state display with styling
 * - Flexible prop forwarding to input element
 * - Consistent styling via CSS classes
 *
 * @dependencies
 * - CSS: Requires .field, .label, .input, .error classes
 *
 * @note This is an alternative to components/auth/Input.jsx
 */
export default function Input({ label, id, error, ...props }) {
  return (
    <div className="field">
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <input 
        id={id} 
        className="input" 
        aria-invalid={Boolean(error)}
        {...props} 
      />
      {error && <div className="error">{error}</div>}
    </div>
  );
}
