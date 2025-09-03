import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import useFormValidation, { commonValidationRules } from '../hooks/useFormValidation';

import { Button, Input, Alert, Card, Link } from './ui';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = React.useState('');

  const validationRules = {
    email: [commonValidationRules.required, commonValidationRules.email],
    password: [commonValidationRules.required, commonValidationRules.minLength(8)],
  };

  const {
    values: formData,
    errors,
    isSubmitting: loading,
    handleChange,
    resetForm,
  } = useFormValidation({ email: '', password: '' }, validationRules);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleInputChange = e => {
    // Clear error when user starts typing
    if (error) setError('');
    handleChange(e);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        resetForm();
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className='min-h-screen bg-surface-soft flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <h2 className='text-3xl font-bold text-ink'>Sign In to Floworx</h2>
          <p className='mt-2 text-ink-sub'>Access your automation dashboard</p>
        </div>

        <Card className='mt-8'>
          {error && (
            <Alert variant='danger' className='mb-6'>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className='space-y-6'>
            <Input
              label='Email Address'
              type='email'
              name='email'
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              placeholder='Enter your email'
              required
              disabled={loading}
            />

            <Input
              label='Password'
              type='password'
              name='password'
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              placeholder='Enter your password'
              required
              disabled={loading}
            />

            <Button type='submit' variant='primary' size='lg' loading={loading} className='w-full'>
              Sign In
            </Button>
          </form>

          <div className='mt-6 space-y-4 text-center'>
            <Link to='/forgot-password' variant='primary'>
              Forgot your password?
            </Link>
            <p className='text-ink-sub'>
              Don&apos;t have an account?{' '}
              <Link to='/register' variant='primary'>
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
