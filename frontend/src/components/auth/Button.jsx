import React from "react";

/**
 * Button - Primary Button Component for Authentication
 *
 * Reusable button component with consistent styling, loading states,
 * and accessibility features for authentication forms.
 *
 * @component
 * @example
 * // Basic usage
 * <Button type="submit">Sign In</Button>
 *
 * // With loading state
 * <Button loading={isSubmitting} disabled={!isValid}>
 *   Create Account
 * </Button>
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button text or content
 * @param {string} [props.type="button"] - Button type (button, submit, reset)
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {boolean} [props.loading=false] - Whether to show loading state
 * @param {Object} props...props - Additional props passed to button element
 *
 * @features
 * - Consistent brand styling with hover/active states
 * - Loading state with spinner animation
 * - Disabled state handling
 * - Full accessibility support (focus, keyboard navigation)
 * - Responsive design
 * - Smooth transitions and animations
 *
 * @dependencies
 * - Tailwind CSS: Styling and responsive design
 */
export default function Button({
  children,
  type = "button",
  disabled = false,
  loading = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        h-11 w-full rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800
        text-white font-semibold transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-transparent
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-brand-600
        flex items-center justify-center gap-2
      `}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
