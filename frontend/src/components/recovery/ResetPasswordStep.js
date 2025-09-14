import axios from 'axios';
import { useState, useEffect } from 'react';

import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ProgressBar from '../ui/ProgressBar';

const ResetPasswordStep = ({ recoveryData: _recoveryData, onComplete, onError }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState([]);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    fetchPasswordRequirements();
  }, []);

  useEffect(() => {
    if (formData.newPassword) {
      calculatePasswordStrength(formData.newPassword);
    } else {
      setPasswordStrength(0);
    }
  }, [formData.newPassword]);

  const fetchPasswordRequirements = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/auth/password-requirements`
      );
      setPasswordRequirements(response.data.requirements || []);
    } catch (error) {
      console.error('Failed to fetch password requirements:', error);
    }
  };

  const calculatePasswordStrength = password => {
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
      password.length >= 12,
    ];

    strength = (checks.filter(Boolean).length / checks.length) * 100;
    setPasswordStrength(Math.round(strength));
  };

  const validatePassword = password => {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return errors;
  };

  const validateForm = () => {
    const newErrors = {};

    // Password validation
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else {
      const passwordErrors = validatePassword(formData.newPassword);
      if (passwordErrors.length > 0) {
        newErrors.newPassword = passwordErrors[0];
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (passwordStrength < 60) {
      setErrors({ newPassword: 'Password is too weak. Please choose a stronger password.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({ newPassword: formData.newPassword });
    } catch (error) {
      onError('Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrengthColor = strength => {
    if (strength < 30) return 'danger';
    if (strength < 60) return 'warning';
    return 'success';
  };

  const getStrengthText = strength => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='w-16 h-16 bg-brand-primary-50 rounded-full flex items-center justify-center mx-auto mb-4'>
          <svg
            className='w-8 h-8 text-brand-primary'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
            />
          </svg>
        </div>
        <h3 className='text-lg font-semibold text-ink mb-2'>Create New Password</h3>
        <p className='text-ink-sub'>Choose a strong password to secure your account.</p>
      </div>

      <Alert variant='info'>
        <strong>Security Tip:</strong> Use a unique password that you haven't used elsewhere.
        Consider using a password manager to generate and store strong passwords.
      </Alert>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <Input
            label='New Password'
            type='password'
            name='newPassword'
            value={formData.newPassword}
            onChange={handleChange}
            error={errors.newPassword}
            placeholder='Enter your new password'
            required
          />

          {formData.newPassword && (
            <div className='mt-2 space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-ink-sub'>Password strength:</span>
                <span className={`font-medium text-${getStrengthColor(passwordStrength)}`}>
                  {getStrengthText(passwordStrength)}
                </span>
              </div>
              <ProgressBar
                value={passwordStrength}
                max={100}
                variant={getStrengthColor(passwordStrength)}
                size='sm'
              />
            </div>
          )}
        </div>

        <Input
          label='Confirm New Password'
          type='password'
          name='confirmPassword'
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder='Confirm your new password'
          required
        />

        {passwordRequirements.length > 0 && (
          <div className='bg-surface-subtle rounded-lg p-4'>
            <h4 className='text-sm font-medium text-ink mb-2'>Password Requirements:</h4>
            <ul className='space-y-1'>
              {passwordRequirements.map((requirement, index) => {
                const isMet =
                  formData.newPassword && validatePassword(formData.newPassword).length === 0;
                return (
                  <li key={index} className='flex items-center text-sm'>
                    <div
                      className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                        isMet ? 'bg-success text-white' : 'bg-surface-border'
                      }`}
                    >
                      {isMet && (
                        <svg className='w-2.5 h-2.5' fill='currentColor' viewBox='0 0 20 20'>
                          <path
                            fillRule='evenodd'
                            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      )}
                    </div>
                    <span className={isMet ? 'text-success' : 'text-ink-sub'}>
                      {requirement.description || requirement}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className='flex justify-end space-x-3 pt-4'>
          <Button
            type='submit'
            variant='primary'
            loading={isSubmitting}
            disabled={!formData.newPassword || !formData.confirmPassword || passwordStrength < 60}
          >
            Reset Password
          </Button>
        </div>
      </form>

      {passwordStrength > 0 && passwordStrength < 60 && (
        <Alert variant='warning'>
          Your password strength is {getStrengthText(passwordStrength).toLowerCase()}. Consider
          adding more characters, numbers, or special characters to make it stronger.
        </Alert>
      )}
    </div>
  );
};

export default ResetPasswordStep;
