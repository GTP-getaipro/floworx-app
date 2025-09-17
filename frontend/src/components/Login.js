import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import useFormValidation, { commonValidationRules } from '../hooks/useFormValidation';
import { parseError, logError, ERROR_MESSAGES } from '../utils/errorHandling';
import Input from './ui/Input';
import Button from './ui/Button';
import Alert from './ui/Alert';
import Card from './ui/Card';
import UILink from './ui/Link';
import Logo from './ui/Logo';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const formValidationRules = {
    email: [commonValidationRules.required, commonValidationRules.email],
    password: [commonValidationRules.required, commonValidationRules.minLength(8)],
  };

  const { values, errors, isSubmitting, handleChange, handleBlur, handleSubmit, setErrors } =
    useFormValidation({ email: '', password: '' }, formValidationRules, { validateOnBlur: true });

  useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleInputChange = e => {
    if (errors.submit) setErrors(errs => ({ ...errs, submit: undefined }));
    handleChange(e);
  };

  const submitLogin = async formValues => {
    try {
      const result = await login(formValues.email, formValues.password);

      if (result.success) {
        showSuccess('Login successful! Redirecting to dashboard...');

        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
        return { success: true };
      }

      // Show error toast
      showError(result.error || 'Login failed. Please check your credentials.');
      setErrors({ submit: result.error });
      return { success: false };
    } catch (error) {
      // Log error for debugging
      logError(error, 'Login');

      // Parse error and show user-friendly message
      const parsedError = parseError(error);

      // Show appropriate error message
      showError(`❌ ${parsedError.message}`);
      setErrors({ submit: parsedError.message });

      // Show additional help for specific error types
      if (parsedError.type === 'AUTHENTICATION_ERROR' && parsedError.message.includes('credentials')) {
        setTimeout(() => {
          showInfo('💡 Make sure you\'re using the correct email and password. You can reset your password if needed.');
        }, 2000);
      } else if (parsedError.type === 'SERVER_ERROR' || parsedError.type === 'UNKNOWN_ERROR') {
        setTimeout(() => {
          showInfo(`💡 ${ERROR_MESSAGES.CONTACT_SUPPORT}`);
        }, 3000);
      }

      return { success: false };
    }
  };

  return (
    <div className='w-full max-w-lg mx-auto py-6 px-4 sm:px-6 lg:px-8'>
      <div className='w-full space-y-6'>
        <div className='text-center'>
          <div className='flex justify-center mb-4'>
            <Logo
              variant='transparent-with-text'
              size='medium'
              alt='FloWorx - Email AI for Hot Tub Professionals'
            />
          </div>
          <h2 className='text-3xl font-bold text-ink'>Sign In to Floworx</h2>
          <p className='mt-2 text-base text-ink-sub'>Access your automation dashboard</p>
        </div>
        <Card className='mt-6' padding='default'>
          {errors.submit && (
            <Alert variant='danger' className='mb-6'>
              {errors.submit}
            </Alert>
          )}
          <form onSubmit={e => handleSubmit(submitLogin, e)} className='space-y-6'>
            <Input
              label='Email Address'
              type='email'
              name='email'
              value={values.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.email}
              placeholder='Enter your email'
              required
              disabled={isSubmitting}
              maxLength={255}
              autoComplete='email'
              data-testid='email-input'
            />
            <Input
              label='Password'
              type='password'
              name='password'
              value={values.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.password}
              placeholder='Enter your password'
              required
              disabled={isSubmitting}
              minLength={8}
              maxLength={128}
              autoComplete='current-password'
              spellCheck={false}
              autoCapitalize='none'
              autoCorrect='off'
              data-testid='password-input'
            />
            <Button
              type='submit'
              variant='primary'
              size='lg'
              loading={isSubmitting}
              className='w-full'
              data-testid='login-button'
            >
              Sign In
            </Button>
          </form>

          <div className='mt-6 space-y-4 text-center'>
            <UILink to='/forgot-password' variant='primary'>
              Forgot your password?
            </UILink>
            <p className='text-ink-sub'>
              Don&apos;t have an account?{' '}
              <UILink to='/register' variant='primary'>
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
