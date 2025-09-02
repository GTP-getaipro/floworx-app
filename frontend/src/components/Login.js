import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Alert, Card, Link } from './ui';
import useFormValidation from '../hooks/useFormValidation';
import { useErrorReporting } from '../contexts/ErrorContext';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { reportError } = useErrorReporting();
  const navigate = useNavigate();
  const location = useLocation();

  const validationRules = {
    email: [
      value => !value ? 'Email is required' : '',
      value => !/\S+@\S+\.\S+/.test(value) ? 'Invalid email format' : ''
    ],
    password: [
      value => !value ? 'Password is required' : '',
      value => value.length < 8 ? 'Password must be at least 8 characters' : ''
    ]
  };

  const {
    values: formData,
    errors,
    isSubmitting: loading,
    handleChange,
    handleBlur,
    handleSubmit: submitForm
  } = useFormValidation(
    { email: '', password: '' },
    validationRules
  );

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-ink">Sign In to Floworx</h2>
          <p className="mt-2 text-ink-sub">Access your automation dashboard</p>
        </div>

        <Card className="mt-8">
          {error && (
            <Alert variant="danger" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
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
              Sign In
            </Button>
          </form>

          <div className="mt-6 space-y-4 text-center">
            <Link to="/forgot-password" variant="primary">
              Forgot your password?
            </Link>
            <p className="text-ink-sub">
              Don't have an account?{' '}
              <Link to="/register" variant="primary">
                Create one here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
