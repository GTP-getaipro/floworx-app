import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './PasswordReset.css';

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [passwordRequirements, setPasswordRequirements] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Extract token from URL
  const urlParams = new URLSearchParams(location.search);
  const token = urlParams.get('token');

  const verifyToken = useCallback(async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/verify-reset-token`,
        {
          token,
        }
      );

      if (response.data.valid) {
        setTokenValid(true);
        setUserInfo({
          email: response.data.email,
          firstName: response.data.firstName,
          expiresAt: response.data.expiresAt,
        });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setError(error.response?.data?.message || 'Invalid or expired reset link.');
    } finally {
      setVerifying(false);
    }
  }, [token]);

  const fetchPasswordRequirements = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/auth/password-requirements`
      );
      setPasswordRequirements(response.data.requirements);
    } catch (error) {
      console.error('Failed to fetch password requirements:', error);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      setVerifying(false);
      return;
    }

    verifyToken();
    fetchPasswordRequirements();
  }, [token, verifyToken]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const validatePassword = password => {
    if (!passwordRequirements) return { valid: true, errors: [] };

    const errors = [];

    if (password.length < passwordRequirements.minLength) {
      errors.push(`Must be at least ${passwordRequirements.minLength} characters long`);
    }

    if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter');
    }

    if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter');
    }

    if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
      errors.push('Must contain at least one number');
    }

    if (passwordRequirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password requirements
    const validation = validatePassword(formData.newPassword);
    if (!validation.valid) {
      setError(`Password requirements not met:\n• ${validation.errors.join('\n• ')}`);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/reset-password`, {
        token,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Password reset successful. Please log in with your new password.',
            },
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className='auth-card'>
        <div className='loading-state'>
          <div className='loading-spinner' />
          <h2>Verifying Reset Link...</h2>
          <p>Please wait while we verify your password reset link.</p>
        </div>
      </div>
    );
  }


  if (!tokenValid) {
    return (
      <div className='auth-card'>
        <div className='error-state'>
          <div className='error-icon'>
            <span>❌</span>
          </div>
          <h2>Invalid Reset Link</h2>
          <p>{error}</p>

          <div className='help-text'>
            <p>
              <strong>This could happen if:</strong>
            </p>
            <ul>
              <li>The link has expired (links expire after 60 minutes)</li>
              <li>The link has already been used</li>
              <li>The link was copied incorrectly</li>
            </ul>
          </div>

          <div className='action-buttons'>
            <Link to='/forgot-password' className='auth-button primary'>
              Request New Reset Link
            </Link>
            <Link to='/login' className='auth-button secondary'>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }


  if (success) {
    return (
      <div className='auth-card'>
        <div className='success-message'>
          <div className='success-icon'>
            <span>✅</span>
          </div>
          <h2>Password Reset Successful!</h2>
          <p>
            Your password has been successfully reset for <strong>{userInfo?.email}</strong>
          </p>

          <div className='success-details'>
            <p>You can now log in with your new password.</p>
            <p>Redirecting to login page in 3 seconds...</p>
          </div>

          <Link to='/login' className='auth-button primary'>
            Go to Login Now
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className='auth-card'>
      <div className='auth-header'>

          <h2>Create New Password</h2>
          <p className='auth-subtitle'>
            Enter a new password for <strong>{userInfo?.email}</strong>
          </p>
        </div>

        {error && (
          <div className='error-message'>
            {error.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className='auth-form'>
          <div className='form-group'>
            <label htmlFor='newPassword'>New Password</label>
            <input
              type='password'
              id='newPassword'
              name='newPassword'
              value={formData.newPassword}
              onChange={handleChange}
              placeholder='Enter your new password'
              required
              disabled={loading}
              autoComplete='new-password'
            />
          </div>

          <div className='form-group'>
            <label htmlFor='confirmPassword'>Confirm New Password</label>
            <input
              type='password'
              id='confirmPassword'
              name='confirmPassword'
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder='Confirm your new password'
              required
              disabled={loading}
              autoComplete='new-password'
            />
          </div>

          {passwordRequirements && (
            <div className='password-requirements'>
              <h4>Password Requirements:</h4>
              <ul>
                <li
                  className={
                    formData.newPassword.length >= passwordRequirements.minLength ? 'met' : ''
                  }
                >
                  At least {passwordRequirements.minLength} characters long
                </li>
                {passwordRequirements.requireUppercase && (
                  <li className={/[A-Z]/.test(formData.newPassword) ? 'met' : ''}>
                    Contains uppercase letter
                  </li>
                )}
                {passwordRequirements.requireLowercase && (
                  <li className={/[a-z]/.test(formData.newPassword) ? 'met' : ''}>
                    Contains lowercase letter
                  </li>
                )}
                {passwordRequirements.requireNumbers && (
                  <li className={/\d/.test(formData.newPassword) ? 'met' : ''}>Contains number</li>
                )}
                {passwordRequirements.requireSpecialChars && (
                  <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'met' : ''}>
                    Contains special character
                  </li>
                )}
              </ul>
            </div>
          )}

          <button
            type='submit'
            className='auth-button primary large'
            disabled={loading || !formData.newPassword || !formData.confirmPassword}
          >
            {loading ? (
              <>
                <div className='button-spinner' />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className='auth-links'>
          <Link to='/login' className='auth-link'>
            Back to Login
          </Link>
        </div>
      </div>
  );
};



export default ResetPassword;
