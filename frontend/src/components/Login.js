import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useFormValidation from '../hooks/useFormValidation';
import { validationRules } from '../utils/validationRules';
import Input from './ui/Input';
import Button from './ui/Button';
import Alert from './ui/Alert';
import Card from './ui/Card';
import UILink from './ui/Link';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const formValidationRules = {
    email: [validationRules.required, validationRules.email],
    password: [validationRules.required, validationRules.minLength(8)],
  };

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setErrors,
  } = useFormValidation(
    { email: '', password: '' },
    formValidationRules,
    { validateOnBlur: true }
  );

  useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleInputChange = (e) => {
    if (errors.submit) setErrors(errs => ({ ...errs, submit: undefined }));
    handleChange(e);
  };

  const submitLogin = async (formValues) => {
    try {
      const result = await login(formValues.email, formValues.password);
      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
        return { success: true };
      }
      setErrors({ submit: result.error });
      return { success: false };
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
      return { success: false };
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
          {errors.submit && (
            <Alert variant="danger" className="mb-6">
              {errors.submit}
            </Alert>
          )}
          <form onSubmit={(e) => handleSubmit(submitLogin, e)} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={values.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.email}
              placeholder="Enter your email"
              required={true}
              disabled={isSubmitting}
            />
            <Input
              label="Password"
              type="password"
              name="password"
              value={values.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.password}
              placeholder="Enter your password"
              required={true}
              disabled={isSubmitting}
            />
            <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
              Sign In
            </Button>
          </form>
          <div className="mt-6 space-y-4 text-center">
            <UILink to="/forgot-password" variant="primary">
              Forgot your password?
            </UILink>
            <p className="text-ink-sub">
              Don't have an account?{' '}
              <UILink to="/register" variant="primary">
                Create one here
              </UILink>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;