import React from "react";
import AuthLayout from "../components/ui/AuthLayout";
import Input from "../components/ui/Input";
import PrimaryButton from "../components/ui/PrimaryButton";

export default function ForgotPasswordPage({ onSubmit, errors = {}, values = {} }) {
  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={onSubmit} noValidate>
        <Input id="email" type="email" label="Email Address *" defaultValue={values.email} error={errors.email} placeholder="you@company.com" />
        <PrimaryButton type="submit">Send Reset Link</PrimaryButton>
        <div className="links">
          <a className="a" href="/login">Back to login</a>
          <a className="a" href="/register">Create account</a>
        </div>
      </form>
    </AuthLayout>
  );
}
