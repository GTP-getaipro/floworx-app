import React from "react";

export default function Input({ label, id, error, ...props }) {
  return (
    <div className="field">
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <input 
        id={id} 
        className="input" 
        aria-invalid={!!error} 
        {...props} 
      />
      {error && <div className="error">{error}</div>}
    </div>
  );
}
