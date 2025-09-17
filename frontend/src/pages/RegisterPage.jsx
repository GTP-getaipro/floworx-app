import React, { useEffect, useState } from "react";
import AuthLayout from "../components/ui/AuthLayout";
import Input from "../components/ui/Input";
import PrimaryButton from "../components/ui/PrimaryButton";
import useFormValidation from "../hooks/useFormValidation";
import useFormPersistence from "../hooks/useFormPersistence";
import { required, email, minLength, passwordStrong, matches } from "../utils/validationRules";

export default function RegisterPage({ onSubmit, errors = {}, values = {} }) {
  const { load, save, clear } = useFormPersistence('auth:register');
  const [showRestoreNotice, setShowRestoreNotice] = useState(false);

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
    <AuthLayout title="Create your Floworx account" subtitle="Start automating your workflow today">
      {showRestoreNotice && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          Previous data restored.
          <button
            type="button"
            onClick={handleClearAndStartFresh}
            style={{
              background: 'none',
              border: 'none',
              color: '#0ea5e9',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            Clear & Start Fresh
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="row">
          <Input
            id="firstName"
            name="firstName"
            label="First Name *"
            value={formValues.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={formErrors.firstName || errors.firstName}
            aria-invalid={!!(formErrors.firstName || errors.firstName)}
          />
          <Input
            id="lastName"
            name="lastName"
            label="Last Name *"
            value={formValues.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={formErrors.lastName || errors.lastName}
            aria-invalid={!!(formErrors.lastName || errors.lastName)}
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
          label="Email Address *"
          value={formValues.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.email || errors.email}
          aria-invalid={!!(formErrors.email || errors.email)}
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password *"
          value={formValues.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.password || errors.password}
          placeholder="Min. 8 characters"
          aria-invalid={!!(formErrors.password || errors.password)}
        />
        <Input
          id="confirm"
          name="confirm"
          type="password"
          label="Confirm Password *"
          value={formValues.confirm}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.confirm || errors.confirm}
          aria-invalid={!!(formErrors.confirm || errors.confirm)}
        />
        <PrimaryButton
          type="submit"
          disabled={!isValid && Object.keys(touched).length > 0}
        >
          Create Account
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
