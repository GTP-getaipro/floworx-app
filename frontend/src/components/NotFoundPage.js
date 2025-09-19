import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * NotFoundPage - 404 Error Page Component
 *
 * Displays a user-friendly 404 error page when users navigate
 * to non-existent routes, with helpful navigation options.
 *
 * @component
 * @example
 * // Usage in router configuration
 * <Route path="*" element={<NotFoundPage />} />
 *
 * @features
 * - Professional 404 error display
 * - Navigation options (back button, home link)
 * - Helpful links to common pages
 * - Responsive design with consistent branding
 * - Browser history integration
 * - SEO-friendly error handling
 *
 * @dependencies
 * - React Router: useNavigate hook and Link component
 * - CSS: Styling classes for layout and design
 */
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-content">
          <div className="error-code">404</div>
          <h1>Page Not Found</h1>
          <p>
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="not-found-actions">
            <button 
              onClick={() => navigate(-1)}
              className="btn secondary"
            >
              ← Go Back
            </button>
            <Link to="/" className="btn primary">
              🏠 Go Home
            </Link>
          </div>

          <div className="helpful-links">
            <h3>Maybe you're looking for:</h3>
            <ul>
              <li><Link to="/dashboard">📊 Dashboard</Link></li>
              <li><Link to="/onboarding">🚀 Setup Automation</Link></li>
              <li><Link to="/api-test">🧪 API Test</Link></li>
              <li><Link to="/login">🔐 Login</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .not-found-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }

        .not-found-container {
          background: white;
          border-radius: 12px;
          padding: 3rem;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
        }

        .error-code {
          font-size: 6rem;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 1rem;
          line-height: 1;
        }

        .not-found-content h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
          color: #333;
        }

        .not-found-content p {
          color: #666;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .not-found-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn.primary {
          background: #667eea;
          color: white;
        }

        .btn.primary:hover {
          background: #5a6fd8;
          transform: translateY(-1px);
        }

        .btn.secondary {
          background: #f8f9fa;
          color: #333;
          border: 1px solid #dee2e6;
        }

        .btn.secondary:hover {
          background: #e9ecef;
          transform: translateY(-1px);
        }

        .helpful-links {
          border-top: 1px solid #eee;
          padding-top: 2rem;
          margin-top: 2rem;
        }

        .helpful-links h3 {
          color: #333;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .helpful-links ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .helpful-links li {
          margin-bottom: 0.5rem;
        }

        .helpful-links a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .helpful-links a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .not-found-page {
            padding: 1rem;
          }
          
          .not-found-container {
            padding: 2rem;
          }
          
          .error-code {
            font-size: 4rem;
          }
          
          .not-found-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default NotFoundPage;
