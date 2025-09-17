import React from "react";
import AuthLayout from "../components/ui/AuthLayout";
import Input from "../components/ui/Input";
import PrimaryButton from "../components/ui/PrimaryButton";

export default function LoginPage({ onSubmit, errors = {}, values = {}, links = {} }) {
  return (
    <AuthLayout title="Sign in to Floworx" subtitle="Access your automation dashboard">
      <form onSubmit={onSubmit} noValidate>
        <Input id="email" type="email" label="Email Address *" defaultValue={values.email} error={errors.email} placeholder="you@company.com" />
        <Input id="password" type="password" label="Password *" defaultValue={values.password} error={errors.password} placeholder="••••••••" />
        <PrimaryButton type="submit">Sign In</PrimaryButton>
        <div className="links">
          <a className="a" href={links.forgotPassword || "/forgot-password"}>Forgot your password?</a>
          <a className="a" href={links.register || "/register"}>Create an account</a>
        </div>
      </form>
    </AuthLayout>
  );
}
