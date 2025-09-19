import React from "react";

/**
 * FormError - Form Error Message Display Component
 *
 * Displays validation error messages with consistent styling
 * and layout preservation when no errors are present.
 *
 * @component
 * @example
 * // With error message
 * <FormError>Password is required</FormError>
 *
 * // Without error (reserves space)
 * <FormError />
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} [props.children] - Error message to display
 *
 * @features
 * - Consistent error message styling
 * - Layout preservation (reserves space when no error)
 * - Accessible error text with proper contrast
 * - Small, unobtrusive design
 * - Responsive typography
 *
 * @dependencies
 * - Tailwind CSS: Styling and responsive design
 */
export default function FormError({ children }) {
  if (!children) {
    return <div className="h-4"></div>; // Reserve space even when no error
  }

  return (
    <div className="h-4">
      <p className="text-red-400 text-xs mt-1">{children}</p>
    </div>
  );
}
