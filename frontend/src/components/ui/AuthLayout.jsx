import React from "react";
import "../../styles/auth.css";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-root">
      <div className="brand">
        <div className="brand-content">
          <span>FloWorx</span>
          <span style={{opacity: 0.85, fontWeight: 500}}>Email AI for Hot Tub Pros</span>
        </div>
      </div>
      <div className="auth-wrap">
        <div className="card">
          {title && <h1 className="h1">{title}</h1>}
          {subtitle && <div className="sub">{subtitle}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
