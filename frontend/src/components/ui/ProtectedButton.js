import Button from './Button';

const ProtectedButton = ({ 
  children, 
  loading = false,
  forceLoading = false,
  loadingText = 'Loading...',
  debounceMs = 0,
  showLoadingState = true,
  ...props 
}) => {
  const isLoading = loading || forceLoading;
  
  return (
    <Button 
      loading={isLoading}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && showLoadingState ? loadingText : children}
    </Button>
  );
};

export default ProtectedButton;
