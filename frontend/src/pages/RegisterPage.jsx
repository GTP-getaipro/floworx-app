import React from "react";
import AuthLayout from "../components/ui/AuthLayout";
import Input from "../components/ui/Input";
import PrimaryButton from "../components/ui/PrimaryButton";

export default function RegisterPage({ onSubmit, errors = {}, values = {} }) {
  return (
    <AuthLayout title="Create your Floworx account" subtitle="Start automating your workflow today">
      <form onSubmit={onSubmit} noValidate>
        <div className="row">
          <Input id="firstName" label="First Name *" defaultValue={values.firstName} error={errors.firstName} />
          <Input id="lastName"  label="Last Name *"  defaultValue={values.lastName}  error={errors.lastName} />
        </div>
        <Input id="company" label="Company (optional)" defaultValue={values.company} />
        <Input id="email" type="email" label="Email Address *" defaultValue={values.email} error={errors.email} />
        <Input id="password" type="password" label="Password *" defaultValue={values.password} error={errors.password} placeholder="Min. 8 characters" />
        <Input id="confirm" type="password" label="Confirm Password *" defaultValue={values.confirm} error={errors.confirm} />
        <PrimaryButton type="submit">Create Account</PrimaryButton>
      </form>
    </AuthLayout>
  );
}
