import React from "react";
import AuthLayout from "../components/ui/AuthLayout";
import Input from "../components/ui/Input";
import PrimaryButton from "../components/ui/PrimaryButton";
import useFormValidation from "../hooks/useFormValidation";
import { required, email, minLength } from "../utils/validationRules";

export default function LoginPage({ onSubmit, errors = {}, values = {}, links = {} }) {
  const {
    values: formValues,
    errors: formErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    isValid
  } = useFormValidation({
    initialValues: { email: values.email || "", password: values.password || "" },
    rules: {
      email: [required(), email()],
      password: [required(), minLength(8)]
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { valid } = validate();
    if (valid) {
      onSubmit(formValues);
    }
  };

  return (
    <AuthLayout title="Sign in to Floworx" subtitle="Access your automation dashboard">
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
        <Input
          id="password"
          name="password"
          type="password"
          label="Password *"
          value={formValues.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.password || errors.password}
          placeholder="••••••••"
          aria-invalid={!!(formErrors.password || errors.password)}
        />
        <PrimaryButton
          type="submit"
          disabled={!isValid && Object.keys(touched).length > 0}
        >
          Sign In
        </PrimaryButton>
        <div className="links">
          <a className="a" href={links.forgotPassword || "/forgot-password"}>Forgot your password?</a>
          <a className="a" href={links.register || "/register"}>Create an account</a>
        </div>
      </form>
    </AuthLayout>
  );
}
