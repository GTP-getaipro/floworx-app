import React from "react";

/**
 * PrimaryButton - Primary Action Button Component
 *
 * Reusable primary button with loading states and consistent styling
 * for main actions throughout the FloWorx application.
 *
 * @component
 * @example
 * // Basic usage
 * <PrimaryButton onClick={handleSubmit}>
 *   Save Changes
 * </PrimaryButton>
 *
 * // With loading state
 * <PrimaryButton loading={isSubmitting} onClick={handleSubmit}>
 *   Create Account
 * </PrimaryButton>
 *
 * // Disabled state
 * <PrimaryButton disabled={!isValid} onClick={handleSubmit}>
 *   Submit Form
 * </PrimaryButton>
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button text or content
 * @param {boolean} [props.loading=false] - Whether to show loading state
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {Function} [props.onClick] - Click handler function
 * @param {Object} props...props - Additional props passed to button element
 *
 * @features
 * - Loading state with "Please wait…" text
 * - Automatic disabled state during loading
 * - Consistent brand styling via CSS classes
 * - Full accessibility support
 * - Flexible content support (text, icons, etc.)
 *
 * @dependencies
 * - CSS: Requires .btn class for styling
 */
export default function PrimaryButton({ children, loading, ...props }) {
  return (
    <button 
      className="btn" 
      disabled={loading || props.disabled} 
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
