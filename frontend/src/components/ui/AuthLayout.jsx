import React from "react";
import "../../styles/auth.css";
import Logo from "./Logo";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-root">
      <div className="brand">
        <div className="brand-content">
          <Logo variant="blue-on-white" size="sm" showText={true} />
        </div>
      </div>
      <div className="auth-wrap">
        <div className="card">
          <div className="auth-card-header">
            <Logo variant="icon" size="md" className="auth-card-logo" />
            {title && <h1 className="h1">{title}</h1>}
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
