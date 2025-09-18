import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from '../../components/AuthLayout';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      });

      if (result.success) {
        navigate('/verify-email', {
          state: {
            email: formData.email,
            message: 'Account created successfully! Please check your email to verify your account.'
          }
        });
      } else {
        // Handle different error types appropriately
        let errorMessage = result.error || 'Registration failed. Please try again.';

        // Provide user-friendly message for duplicate email
        if (result.status === 409 || result.code === 'EMAIL_EXISTS') {
          errorMessage = 'This email is already registered. Please sign in or use a different email address.';
        }

        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout 
      title="Create your FloWorx account" 
      subtitle="Start automating your workflow today"
    >
      {errors.submit && (
        <div className="error-callout">
          {errors.submit}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName" className="form-label">First Name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              className={`form-input ${errors.firstName ? 'error' : ''}`}
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="John"
              disabled={isSubmitting}
              autoComplete="given-name"
              required
            />
            {errors.firstName && <div className="error-message">{errors.firstName}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="lastName" className="form-label">Last Name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              className={`form-input ${errors.lastName ? 'error' : ''}`}
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Doe"
              disabled={isSubmitting}
              autoComplete="family-name"
              required
            />
            {errors.lastName && <div className="error-message">{errors.lastName}</div>}
          </div>
        </div>

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
            autoComplete="new-password"
            required
          />
          {errors.password && <div className="error-message">{errors.password}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/login" className="auth-link">
          Already have an account? Sign in
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Register;
