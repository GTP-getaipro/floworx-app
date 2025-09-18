import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Simple, robust registration form without complex dependencies
const SimpleRegisterForm = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  // Simple validation function
  function validateForm() {
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
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(formData.password)) {
      newErrors.password = 'Password must include uppercase, lowercase, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  }

  // Handle input changes
  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      console.log('Starting registration process...');
      
      const result = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        businessName: formData.companyName,
        phone: '+1234567890', // Default phone
        agreeToTerms: true,
        marketingConsent: false,
      });

      if (result && result.success) {
        console.log('Registration successful');
        setSuccessEmail(formData.email);
        setShowSuccess(true);
      } else {
        console.error('Registration failed:', result);
        setErrors({ 
          submit: result?.error || 'Registration failed. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ 
        submit: 'Registration failed. Please try again or contact support if the problem persists.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Success message component
  if (showSuccess) {
    return (
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-2">We've sent a verification link to:</p>
            <p className="font-medium text-gray-900 mb-4">{successEmail}</p>
            <p className="text-sm text-gray-600 mb-6">
              Click the link in the email to verify your account and complete your registration.
            </p>
            
            <div className="text-left">
              <h3 className="font-medium text-gray-900 mb-2">Next Steps:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Check your email inbox (and spam folder)</li>
                <li>• Click the "Verify My Email Address" button in the email</li>
                <li>• You'll be redirected back to log in</li>
                <li>• Start automating your hot tub business emails!</li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Didn't receive the email?</p>
              <button
                onClick={() => setShowSuccess(false)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to Registration
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>The verification link will expire in 24 hours for security.</p>
              <p>Need help? Contact us at <a href="mailto:support@floworx-iq.com" className="text-blue-600">support@floworx-iq.com</a></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="max-w-md w-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-blue-600 mb-2">F</div>
          <h2 className="text-xl font-semibold text-gray-900">Create Your Floworx Account</h2>
          <p className="text-gray-600">Start automating your workflow today</p>
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Your first name"
                autoComplete="given-name"
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Your last name"
                autoComplete="family-name"
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your company name (optional)"
              autoComplete="organization"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your business email"
              autoComplete="email"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Create a password (min. 8 characters)"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSubmitting
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:text-blue-500">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
};

export default SimpleRegisterForm;
