import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Alert, Card, Link } from './ui';
import useFormValidation, { commonValidationRules } from '../hooks/useFormValidation';
import useApiRequest from '../hooks/useApiRequest';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      return 'Please fill in all required fields';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName
      });

      if (result.success) {
        if (result.requiresVerification) {
          setRequiresVerification(true);
          setSuccess(true);
        } else {
          setSuccess(true);
          // Auto-redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <Alert variant="success" title="Registration Successful! ✅">
              {requiresVerification ? (
                <div className="space-y-4">
                  <p>Your account has been created successfully!</p>
                  <p><strong>Please check your email to verify your account.</strong></p>
                  <p>We've sent a verification link to <strong>{formData.email}</strong></p>
                  <div className="mt-4 p-4 bg-surface-subtle rounded-lg">
                    <p className="font-medium text-ink mb-2">Didn't receive the email?</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-ink-sub">
                      <li>Check your spam/junk folder</li>
                      <li>Make sure you entered the correct email address</li>
                      <li>Wait a few minutes and check again</li>
                    </ul>
                    <div className="mt-3">
                      <Link to="/verify-email" variant="primary">
                        Need to resend verification email?
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p>Your account has been created successfully.</p>
                  <p>Redirecting to your dashboard...</p>
                </div>
              )}
            </Alert>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-ink">Create Your Floworx Account</h2>
          <p className="mt-2 text-ink-sub">Start automating your workflow today</p>
        </div>

        <Card className="mt-8">
          {error && (
            <Alert variant="danger" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Your first name"
                disabled={loading}
              />

              <Input
                label="Last Name"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Your last name"
                disabled={loading}
              />
            </div>

            <Input
              label="Company Name"
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Your company name (optional)"
              disabled={loading}
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your business email"
              required
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min. 8 characters)"
              required
              disabled={loading}
              helperText="Password must be at least 8 characters long"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-ink-sub">
              Already have an account?{' '}
              <Link to="/login" variant="primary">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
