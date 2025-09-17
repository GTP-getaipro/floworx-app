import React from "react";

export default function Button({ 
  children, 
  type = "button", 
  disabled = false, 
  loading = false,
  ...props 
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        h-11 w-full rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800
        text-white font-semibold transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-transparent
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-brand-600
        flex items-center justify-center gap-2
      `}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
