import React from "react";
import AuthLayout from "../components/ui/AuthLayout";
import Callout from "../components/ui/Callout";

export default function CheckEmailPage({ email }) {
  return (
    <AuthLayout title="Check your email">
      <Callout>
        We've sent a password reset link to <strong>{email}</strong>.<br/>
        The link expires in 60 minutes and can be used once.
      </Callout>
      <div className="links" style={{marginTop: 16}}>
        <a className="a" href="/forgot-password">Send another link</a>
        <a className="a" href="/login">Back to login</a>
      </div>
    </AuthLayout>
  );
}
