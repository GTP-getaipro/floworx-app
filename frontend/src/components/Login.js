import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AuthLayout from './ui/AuthLayout';
import Input from './ui/Input';
import PrimaryButton from './ui/PrimaryButton';

const Login = () => {
  const { login, isAuthenticated, clearErrors } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Clear any previous auth errors when component mounts
    clearErrors();

    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state, clearErrors]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear errors when user starts typing
    if (errors[name] || errors.submit) {
      setErrors(prev => ({ ...prev, [name]: '', submit: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        showSuccess('Login successful! Redirecting to dashboard...');
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        // Handle specific error cases
        if (result.code === 'UNVERIFIED') {
          setErrors({
            submit: result.error,
            showResend: true,
            resendUrl: result.resendUrl
          });
          showError('Please verify your email address before logging in.');
        } else {
          setErrors({ submit: result.error || 'Login failed. Please try again.' });
          showError(result.error || 'Login failed. Please check your credentials and try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setErrors({ submit: errorMessage });
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Sign in to Floworx" subtitle="Access your automation dashboard">
      {errors.submit && (
        <div className="error" style={{marginBottom: '14px', padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px'}}>
          {errors.submit}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email Address *"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          placeholder="you@company.com"
          disabled={isSubmitting}
          autoComplete="email"
          data-testid="email-input"
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password *"
          value={formData.password}
          onChange={handleInputChange}
          error={errors.password}
          placeholder="••••••••"
          disabled={isSubmitting}
          autoComplete="current-password"
          data-testid="password-input"
        />
        <PrimaryButton
          type="submit"
          loading={isSubmitting}
          data-testid="login-button"
        >
          Sign In
        </PrimaryButton>
        <div className="links">
          <a className="a" href="/forgot-password">Forgot your password?</a>
          <a className="a" href="/register">Create an account</a>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
