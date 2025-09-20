import AuthLayout from "../components/ui/AuthLayout";
import Callout from "../components/ui/Callout";

/**
 * CheckEmailPage - Email Verification Instruction Page
 *
 * Displays instructions to users after they request a password reset,
 * informing them to check their email for the reset link.
 *
 * @component
 * @example
 * // Usage after password reset request
 * <CheckEmailPage email="user@example.com" />
 *
 * @param {Object} props - Component props
 * @param {string} props.email - Email address where reset link was sent
 *
 * @features
 * - Clear instructions for next steps
 * - Email address confirmation display
 * - Link expiration information (60 minutes)
 * - Options to resend link or return to login
 * - Consistent authentication page styling
 * - Professional user experience
 *
 * @dependencies
 * - AuthLayout: Consistent authentication page layout
 * - Callout: Highlighted information display component
 */
export default function CheckEmailPage({ email }) {
  return (
    <AuthLayout title="Check your email">
      <Callout>
        We've sent a password reset link to <strong>{email}</strong>.<br/>
        The link expires in 60 minutes and can be used once.
      </Callout>
      <div className="links" style={{marginTop: 16}}>
        <a className="a" href="/forgot-password">Send another link</a>
        <a className="a" href="/login">Back to login</a>
      </div>
    </AuthLayout>
  );
}
