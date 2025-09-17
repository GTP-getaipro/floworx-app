import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AuthLayout from './ui/AuthLayout';
import Input from './ui/Input';
import PrimaryButton from './ui/PrimaryButton';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
        setErrors({ submit: result.error || 'Login failed. Please try again.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
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
