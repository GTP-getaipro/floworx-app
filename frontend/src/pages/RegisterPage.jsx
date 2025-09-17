import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/auth/Input";
import PasswordInput from "../components/auth/PasswordInput";
import Button from "../components/auth/Button";
import useFormValidation from "../hooks/useFormValidation";
import useFormPersistence from "../hooks/useFormPersistence";
import { required, email, minLength, passwordStrong, matches } from "../utils/validationRules";
import { handleReturnToFromQuery } from "../lib/returnTo";

export default function RegisterPage({ onSubmit, errors = {}, values = {} }) {
  const { load, save, clear } = useFormPersistence('auth:register');
  const [showRestoreNotice, setShowRestoreNotice] = useState(false);
  const [searchParams] = useSearchParams();

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const { valid } = validate();
    if (valid) {
      clear(); // Clear saved data on successful submit
      onSubmit(formValues);
    }
  };

  const handleClearAndStartFresh = () => {
    clear();
    setShowRestoreNotice(false);
    Object.keys(formValues).forEach(key => setValue(key, ""));
  };

  return (
    <AuthLayout title="Create your FloWorx account" subtitle="Start automating your workflow today">
      {showRestoreNotice && (
        <div className="bg-blue-50/20 border border-blue-300/30 rounded-xl p-3 mb-4 text-sm text-slate-200">
          Previous data restored.
          <button
            type="button"
            onClick={handleClearAndStartFresh}
            className="ml-2 text-brand-300 hover:text-white underline"
          >
            Clear & Start Fresh
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="firstName"
            name="firstName"
            label="First Name"
            value={formValues.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={formErrors.firstName || errors.firstName}
          />
          <Input
            id="lastName"
            name="lastName"
            label="Last Name"
            value={formValues.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={formErrors.lastName || errors.lastName}
          />
        </div>
        <Input
          id="company"
          name="company"
          label="Company (optional)"
          value={formValues.company}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email Address"
          value={formValues.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.email || errors.email}
          placeholder="Enter your business email"
        />
        <PasswordInput
          id="password"
          name="password"
          label="Password"
          value={formValues.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.password || errors.password}
          placeholder="Create a password (min. 8 characters)"
        />
        <PasswordInput
          id="confirm"
          name="confirm"
          label="Confirm Password"
          value={formValues.confirm}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.confirm || errors.confirm}
          placeholder="Confirm your password"
        />
        <Button
          type="submit"
          disabled={!isValid && Object.keys(touched).length > 0}
        >
          Create Account
        </Button>
        <div className="text-center pt-2">
          <span className="text-slate-200 text-sm">Already have an account? </span>
          <a
            href="/login"
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm"
          >
            Sign in here
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}
