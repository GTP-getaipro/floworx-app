import React from "react";

/**
 * Callout - Highlighted Information Display Component
 *
 * Displays important information or messages with highlighted styling
 * to draw user attention to key content.
 *
 * @component
 * @example
 * // Basic usage
 * <Callout>
 *   Important: Please check your email for verification.
 * </Callout>
 *
 * // With formatted content
 * <Callout>
 *   We've sent a reset link to <strong>user@example.com</strong>.
 *   <br />The link expires in 60 minutes.
 * </Callout>
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to display in the callout
 *
 * @features
 * - Highlighted styling to draw attention
 * - Flexible content support (text, HTML, components)
 * - Consistent design with application theme
 * - Responsive layout
 *
 * @dependencies
 * - CSS: Requires .callout class for styling
 */
export default function Callout({ children }) {
  return <div className="callout">{children}</div>;
}
