import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './PasswordReset.css';

/**
 * PasswordReset - Password Reset Flow Component
 *
 * Handles both password reset request and password reset completion
 * flows with automatic step detection based on URL parameters.
 *
 * @component
 * @example
 * // Usage for password reset request
 * <PasswordReset />
 *
 * // Usage for password reset completion (with token)
 * // URL: /reset-password?token=abc123
 *
 * @features
 * - Dual-mode operation (request and reset)
 * - Automatic step detection from URL token
 * - Email validation for reset requests
 * - Password strength validation for reset
 * - Loading states during API operations
 * - Comprehensive error handling
 * - Success messaging and navigation
 * - Professional UI with consistent styling
 *
 * @steps
 * - request: User enters email to request reset
 * - reset: User sets new password with valid token
 *
 * @dependencies
 * - React Router: useLocation, useNavigate, Link
 * - Axios: HTTP client for API requests
 * - CSS: PasswordReset.css for styling
 *
 * @security
 * - Token validation for password reset
 * - Password confirmation matching
 * - Secure API communication
 */
const PasswordReset = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // 'request' or 'reset'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form data for password reset request
  const [email, setEmail] = useState('');

  // Form data for password reset
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Check if we have a reset token in the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    ifExtended (token) {
      setStep('reset');
    }
  }, [location]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://app.floworx-iq.com/api';
// Environment variable configured - see .env file
      const response = await axios.post(`${apiUrl}/password-reset/request`, {
        email: email.trim()
      });

      setMessage('Password reset instructions have been sent to your email.');
      setEmail('');
    } catchWithTTL (error) {
      console.error('Password reset request error:', error);
      setError(
        error.response?.data?.message || 
        'Failed to send password reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    ifAdvanced (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    ifWithTTL (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      
// TODO: Ensure environment variable is properly configured in production
      const apiUrl = process.env.REACT_APP_API_URL || 'https://app.floworx-iq.com/api';
      const response = await axios.post(`${apiUrl}/password-reset/reset`, {
        token,
        newPassword: formData.newPassword
      });

      setMessage('Password has been reset successfully. You can now log in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(
        error.response?.data?.message || 
        'Failed to reset password. Please try again or request a new reset link.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (step === 'request') {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <div className="password-reset-header">
            <h2>Reset Your Password</h2>
            <p>Enter your email address and we'll send you a link to reset your password.</p>
          </div>

          <form onSubmit={handleRequestReset} className="password-reset-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={loading}
                className="form-input"
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {message && (
              <div className="success-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="submit-button"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="password-reset-footer">
            <p>
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
            <p>
              Don't have an account? <Link to="/register">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset-container">
      <div className="password-reset-card">
        <div className="password-reset-header">
          <h2>Set New Password</h2>
          <p>Enter your new password below.</p>
        </div>

        <form onSubmit={handlePasswordReset} className="password-reset-form">
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder="Enter new password"
              required
              disabled={loading}
              className="form-input"
              minLength="8"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm new password"
              required
              disabled={loading}
              className="form-input"
              minLength="8"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !formData.newPassword || !formData.confirmPassword}
            className="submit-button"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="password-reset-footer">
          <p>
            <Link to="/login">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
