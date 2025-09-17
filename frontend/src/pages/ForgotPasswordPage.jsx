import React, { useEffect } from "react";
import AuthLayout from "../components/ui/AuthLayout";
import Input from "../components/ui/Input";
import PrimaryButton from "../components/ui/PrimaryButton";
import useFormValidation from "../hooks/useFormValidation";
import useFormPersistence from "../hooks/useFormPersistence";
import { required, email } from "../utils/validationRules";

export default function ForgotPasswordPage({ onSubmit, errors = {}, values = {} }) {
  const { load, save } = useFormPersistence('auth:forgot');

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
    initialValues: { email: values.email || "" },
    rules: {
      email: [required(), email()]
    }
  });

  useEffect(() => {
    const savedData = load();
    if (savedData?.email) {
      setValue('email', savedData.email);
    }
  }, [load, setValue]);

  useEffect(() => {
    save(formValues);
  }, [formValues, save]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const { valid } = validate();
    if (valid) {
      onSubmit(formValues);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email Address *"
          value={formValues.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.email || errors.email}
          placeholder="you@company.com"
          aria-invalid={!!(formErrors.email || errors.email)}
        />
        <PrimaryButton
          type="submit"
          disabled={!isValid && Object.keys(touched).length > 0}
        >
          Send Reset Link
        </PrimaryButton>
        <div className="links">
          <a className="a" href="/login">Back to login</a>
          <a className="a" href="/register">Create account</a>
        </div>
      </form>
    </AuthLayout>
  );
}
