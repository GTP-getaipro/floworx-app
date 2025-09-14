
const ProgressBar = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variants = {
    primary: 'bg-gradient-to-r from-brand-primary to-brand-primary-hover',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className='flex justify-between items-center mb-2'>
          <span className='text-sm font-medium text-ink'>Progress</span>
          <span className='text-sm text-ink-sub'>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-surface-border rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${sizes[size]} ${variants[variant]} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
