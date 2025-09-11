import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import useFormValidation from '../hooks/useFormValidation';
import { validationRules } from '../utils/validationRules';
import Input from './ui/Input';
import Button from './ui/Button';
import Alert from './ui/Alert';
import Card from './ui/Card';
import UILink from './ui/Link';
import Logo from './ui/Logo';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const formValidationRules = {
    email: [validationRules.required, validationRules.email],
    password: [validationRules.required, validationRules.minLength(8)],
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
      console.error('❌ Login error:', error); // eslint-disable-line no-console

      const errorMessage = 'An unexpected error occurred. Please try again.';
      showError(errorMessage);
      setErrors({ submit: errorMessage });
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

          <div className='mt-6'>
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-300' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-white text-gray-500'>Or continue with</span>
              </div>
            </div>

            <div className='mt-6'>
              <Button
                type='button'
                variant='outline'
                size='lg'
                className='w-full flex items-center justify-center space-x-2'
                onClick={() => {
                  window.location.href = `${process.env.REACT_APP_API_URL || 'https://app.floworx-iq.com/api'}/auth/google`;
                }}
                data-testid='google-oauth-button'
              >
                <svg className='w-5 h-5' viewBox='0 0 24 24'>
                  <path
                    fill='#4285F4'
                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  />
                  <path
                    fill='#34A853'
                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  />
                  <path
                    fill='#FBBC05'
                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  />
                  <path
                    fill='#EA4335'
                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>
            </div>
          </div>

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
