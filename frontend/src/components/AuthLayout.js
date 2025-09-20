import '../styles/auth.css';

const AuthLayout = ({ 
  title, 
  subtitle, 
  children, 
  showBrandBar = true,
  className = '' 
}) => {
  return (
    <div className={`auth-container ${className}`}>
      {showBrandBar && (
        <div className="brand-bar">
          <div className="brand-content">
            <div className="brand-logo">
              <span className="brand-name">FloWorx</span>
            </div>
            <span className="brand-tagline">Email AI for Hot Tub Pros</span>
          </div>
        </div>
      )}
      
      <div className="auth-content">
        <div className="auth-card">
          {title && (
            <div className="auth-header">
              <h1 className="auth-title">{title}</h1>
              {subtitle && <p className="auth-subtitle">{subtitle}</p>}
            </div>
          )}
          
          <div className="auth-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
