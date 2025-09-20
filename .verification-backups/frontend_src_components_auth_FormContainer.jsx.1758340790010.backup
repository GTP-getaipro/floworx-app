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
      className={`space-y-3 ${className}`}
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
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
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
          bg-white border border-gray-300 rounded-lg
          text-gray-900 placeholder-gray-500 text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
          ${hasError ? 'border-red-400 focus:ring-red-400' : ''}
          ${className}
        `}
      />
      {hasError && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
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
  const baseClasses = "w-full h-11 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm";

  const variantClasses = {
    primary: `
      bg-blue-600 hover:bg-blue-700
      text-white shadow-lg hover:shadow-xl
      disabled:bg-gray-400 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-gray-100 hover:bg-gray-200
      text-gray-700 border border-gray-300
      disabled:bg-gray-100 disabled:cursor-not-allowed
    `,
    link: `
      bg-transparent hover:bg-gray-100
      text-blue-600 hover:text-blue-700
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
        text-sm text-blue-600 hover:text-blue-700
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
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800"
  };

  return (
    <div className={`
      p-3 rounded-lg border
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
