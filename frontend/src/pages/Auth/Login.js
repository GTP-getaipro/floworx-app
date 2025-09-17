import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from '../../components/AuthLayout';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
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
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        if (result.error?.code === 'UNVERIFIED') {
          setErrors({ 
            submit: 'Please verify your email address before logging in.',
            showResend: true 
          });
        } else {
          setErrors({ submit: result.error?.message || 'Login failed. Please try again.' });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout 
      title="Sign in to FloWorx" 
      subtitle="Access your automation dashboard"
    >
      {errors.submit && (
        <div className="error-callout">
          {errors.submit}
          {errors.showResend && (
            <div style={{ marginTop: '8px' }}>
              <Link to="/resend-verification" className="auth-link">
                Resend verification email
              </Link>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            value={formData.email}
            onChange={handleInputChange}
            placeholder="you@company.com"
            disabled={isSubmitting}
            autoComplete="email"
            required
          />
          {errors.email && <div className="error-message">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className={`form-input ${errors.password ? 'error' : ''}`}
            value={formData.password}
            onChange={handleInputChange}
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="current-password"
            required
          />
          {errors.password && <div className="error-message">{errors.password}</div>}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/forgot-password" className="auth-link">
          Forgot your password?
        </Link>
        <Link to="/register" className="auth-link">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
