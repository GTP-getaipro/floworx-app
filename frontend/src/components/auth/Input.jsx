import React from "react";

export default function Input({ 
  id, 
  label, 
  type = "text", 
  value, 
  onChange, 
  onBlur, 
  error, 
  placeholder,
  ...props 
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-slate-100 text-sm font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`
          h-11 w-full rounded-xl bg-white/90 text-slate-900 placeholder-slate-400
          ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none px-3
          transition-all duration-200
          ${error ? 'ring-2 ring-red-500' : ''}
        `}
        {...props}
      />
      {/* Error message with reserved space */}
      <div className="h-4">
        {error && (
          <p className="text-red-400 text-xs mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}
