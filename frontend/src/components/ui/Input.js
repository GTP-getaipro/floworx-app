// Input component for forms

const Input = ({ label, error, helperText, required = false, className = '', id, name, ...props }) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  // Convert camelCase to kebab-case for data-testid
  const kebabCaseName = name ? name.replace(/([A-Z])/g, '-$1').toLowerCase() : null;

  const inputClasses = `
    w-full px-3 py-2 border rounded-lg text-ink bg-surface
    placeholder:text-ink-sub
    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-hover focus:border-brand-primary
    disabled:bg-surface-subtle disabled:cursor-not-allowed disabled:text-ink-sub
    transition-colors duration-200
    ${
      error
        ? 'border-danger focus-visible:ring-red-500 focus:border-danger'
        : 'border-surface-border hover:border-ink-sub'
    }
    ${className}
  `
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <div className='space-y-1'>
      {label && (
        <label htmlFor={inputId} className='block text-sm font-medium text-ink'>
          {label}
          {required && <span className='text-danger ml-1'>*</span>}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        data-testid={props['data-testid'] || (kebabCaseName ? `${kebabCaseName}-input` : undefined)}
        className={inputClasses}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : (helperText ? `${inputId}-help` : undefined)}
        {...props}
      />

      {error && (
        <p
          id={`${inputId}-error`}
          data-testid={kebabCaseName ? `${kebabCaseName}-error` : 'input-error'}
          className='text-sm text-danger flex items-start gap-1 break-words'
          role='alert'
          aria-live='polite'
        >
          <svg className='w-4 h-4 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
          <span className='break-words whitespace-pre-wrap'>{error}</span>
        </p>
      )}

      {helperText && !error && <p className='text-sm text-ink-sub'>{helperText}</p>}
    </div>
  );
};

export default Input;
