import React from "react";

/**
 * Standardized Form Container for Auth Pages
 * 
 * Features:
 * - Compact spacing to keep forms above the fold
 * - Consistent input heights (h-10)
 * - Full-width buttons with max height h-11
 * - Mobile-first responsive design
 * - Loading states and error handling
 */
export default function FormContainer({ 
  children, 
  onSubmit, 
  className = "",
  loading = false 
}) {
  return (
    <form 
      onSubmit={onSubmit} 
      className={`space-y-4 ${className}`}
      noValidate
    >
      {children}
    </form>
  );
}

// Standardized Input Component
export function FormInput({ 
  label, 
  type = "text", 
  name, 
  value, 
  onChange, 
  onBlur,
  error, 
  touched,
  placeholder,
  autoFocus = false,
  required = false,
  className = ""
}) {
  const hasError = touched && error;
  
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-white">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        className={`
          w-full h-10 px-3 py-2 
          bg-white/10 border border-white/20 rounded-lg
          text-white placeholder-gray-300
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
          transition-colors duration-200
          ${hasError ? 'border-red-400 focus:ring-red-400' : ''}
          ${className}
        `}
      />
      {hasError && (
        <p className="text-sm text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

// Standardized Button Component
export function FormButton({ 
  children, 
  type = "submit", 
  loading = false, 
  disabled = false,
  variant = "primary",
  onClick,
  className = ""
}) {
  const baseClasses = "w-full h-11 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  
  const variantClasses = {
    primary: `
      bg-brand-600 hover:bg-brand-700 
      text-white shadow-lg hover:shadow-xl
      disabled:bg-gray-600 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-white/10 hover:bg-white/20 
      text-white border border-white/20
      disabled:bg-gray-600 disabled:cursor-not-allowed
    `,
    link: `
      bg-transparent hover:bg-white/10 
      text-brand-200 hover:text-white
      h-auto py-2
    `
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {loading ? 'Processing...' : children}
    </button>
  );
}

// Link Component for auth navigation
export function FormLink({ 
  to, 
  children, 
  className = "",
  onClick 
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-sm text-brand-200 hover:text-white 
        transition-colors duration-200 
        underline hover:no-underline
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// Alert/Message Component
export function FormAlert({ 
  type = "info", 
  children, 
  className = "" 
}) {
  const typeClasses = {
    success: "bg-green-500/20 border-green-400 text-green-100",
    error: "bg-red-500/20 border-red-400 text-red-100",
    warning: "bg-yellow-500/20 border-yellow-400 text-yellow-100",
    info: "bg-blue-500/20 border-blue-400 text-blue-100"
  };
  
  return (
    <div className={`
      p-3 rounded-lg border backdrop-blur-sm
      ${typeClasses[type]}
      ${className}
    `}>
      {children}
    </div>
  );
}

// Divider with text
export function FormDivider({ children }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/20"></div>
      </div>
      {children && (
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 text-gray-300">
            {children}
          </span>
        </div>
      )}
    </div>
  );
}

// Navigation links container
export function FormNavigation({ children, className = "" }) {
  return (
    <div className={`flex items-center justify-between text-sm mt-4 ${className}`}>
      {children}
    </div>
  );
}
