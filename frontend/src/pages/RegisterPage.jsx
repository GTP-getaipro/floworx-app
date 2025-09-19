import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import FormContainer, { FormInput, FormButton, FormAlert, FormNavigation, FormLink } from "../components/auth/FormContainer";
import useFormValidation from "../hooks/useFormValidation";
import useFormPersistence from "../hooks/useFormPersistence";
import { required, email, minLength, passwordStrong, matches } from "../utils/validationRules";
import { handleReturnToFromQuery } from "../lib/returnTo";
import { useAuth } from "../contexts/AuthContext";

/**
 * RegisterPage - User Registration Page
 *
 * Handles user registration with form validation, persistence, and error handling.
 * Supports both prop-based and context-based usage patterns for flexibility.
 *
 * @component
 * @param {Object} props - Component props (optional for backward compatibility)
 * @param {Object} props.errors - Initial error state (optional)
 * @param {Object} props.values - Initial form values (optional)
 *
 * @example
 * // Primary usage with AuthContext (recommended)
 * <RegisterPage />
 *
 * // Legacy usage with props (backward compatibility)
 * <RegisterPage errors={errors} values={values} />
 *
 * @features
 * - Uses AuthContext for registration
 * - Form validation with real-time feedback
 * - Form persistence across sessions
 * - Loading states and error handling
 * - Auto-redirect to email verification
 *
 * @dependencies
 * - AuthContext: Must be wrapped in AuthProvider
 * - React Router: Uses useNavigate and useSearchParams
 */
export default function RegisterPage({ errors = {}, values = {} }) {
  const { register } = useAuth();
  const { load, save, clear } = useFormPersistence('auth:register');
  const [showRestoreNotice, setShowRestoreNotice] = useState(false);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    values: formValues,
    errors: formErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    isValid,
    setValue
  } = useFormValidation({
    initialValues: {
      firstName: values.firstName || "",
      lastName: values.lastName || "",
      company: values.company || "",
      email: values.email || "",
      password: values.password || "",
      confirm: values.confirm || ""
    },
    rules: {
      firstName: [required()],
      lastName: [required()],
      email: [required(), email()],
      password: [required(), minLength(8), passwordStrong()],
      confirm: [required(), matches('password')]
    }
  });

  useEffect(() => {
    const savedData = load();
    if (savedData && Object.keys(savedData).some(key => savedData[key])) {
      setShowRestoreNotice(true);
      Object.keys(savedData).forEach(key => {
        if (savedData[key]) {
          setValue(key, savedData[key]);
        }
      });
    }
  }, [load, setValue]);

  // Handle returnTo from query params on mount
  useEffect(() => {
    handleReturnToFromQuery(searchParams);
  }, [searchParams]);

  useEffect(() => {
    save(formValues);
  }, [formValues, save]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const result = await register({
        email: formValues.email,
        password: formValues.password,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        businessName: formValues.company || '',
        agreeToTerms: true,
        marketingConsent: false
      });

      if (result.success) {
        clear(); // Clear saved data on successful submission
        setSubmitSuccess(true);

        // Auto-redirect to email verification after 2 seconds
        setTimeout(() => {
          navigate('/verify-email');
        }, 2000);
      } else {
        setSubmitError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setSubmitError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAndStartFresh = () => {
    clear();
    setShowRestoreNotice(false);
    Object.keys(formValues).forEach(key => setValue(key, ""));
  };

  return (
    <AuthLayout title="Create your FloWorx account" subtitle="Start automating your workflow today">
      {/* Success message */}
      {submitSuccess && (
        <FormAlert type="success" className="mb-4">
          Account created successfully! Redirecting to email verification...
        </FormAlert>
      )}

      {/* Error message */}
      {submitError && (
        <FormAlert type="error" className="mb-4">
          {submitError}
        </FormAlert>
      )}

      {/* Previous data restored notice - only show if not fresh load */}
      {showRestoreNotice && (
        <FormAlert type="info" className="mb-4">
          Previous data restored.
          <FormLink onClick={handleClearAndStartFresh} className="ml-2">
            Clear & Start Fresh
          </FormLink>
        </FormAlert>
      )}

      {/* Error message */}
      {submitError && (
        <FormAlert type="error" className="mb-4">
          {submitError}
        </FormAlert>
      )}

      {/* Success message */}
      {submitSuccess && (
        <FormAlert type="success" className="mb-4">
          Account created successfully! Please check your email to verify your account.
          Redirecting to verification page...
        </FormAlert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Single column layout for compact spacing */}
        <FormInput
          name="firstName"
          label="First Name"
          value={formValues.firstName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.firstName || errors.firstName}
          touched={touched.firstName}
          autoFocus={true}
          required={true}
          placeholder="Enter your first name"
          disabled={loading}
        />

        <FormInput
          name="lastName"
          label="Last Name"
          value={formValues.lastName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.lastName || errors.lastName}
          touched={touched.lastName}
          required={true}
          placeholder="Enter your last name"
          disabled={loading}
        />

        <FormInput
          name="company"
          label="Company"
          value={formValues.company}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.company || errors.company}
          touched={touched.company}
          placeholder="Your company name (optional)"
          disabled={loading}
        />

        <FormInput
          name="email"
          type="email"
          label="Email Address"
          value={formValues.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.email || errors.email}
          touched={touched.email}
          required={true}
          placeholder="Enter your business email"
          disabled={loading}
        />

        <FormInput
          name="password"
          type="password"
          label="Password"
          value={formValues.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.password || errors.password}
          touched={touched.password}
          required={true}
          placeholder="Create a strong password (min. 8 characters)"
          disabled={loading}
        />

        <FormInput
          name="confirm"
          type="password"
          label="Confirm Password"
          value={formValues.confirm}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.confirm || errors.confirm}
          touched={touched.confirm}
          required={true}
          placeholder="Confirm your password"
          disabled={loading}
        />

        <FormButton
          type="submit"
          loading={loading}
          disabled={loading || (!isValid && Object.keys(touched).length > 0)}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </FormButton>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-4 text-sm text-gray-600">
          <span>Already have an account?</span>
          <FormLink onClick={() => navigate('/login')}>
            Sign in here
          </FormLink>
        </div>
      </form>
    </AuthLayout>
  );
}
