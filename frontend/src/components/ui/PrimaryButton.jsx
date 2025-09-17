import React from "react";

export default function PrimaryButton({ children, loading, ...props }) {
  return (
    <button 
      className="btn" 
      disabled={loading || props.disabled} 
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
