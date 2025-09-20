import React from 'react';
import SimpleRegisterForm from '../components/SimpleRegisterForm';

/**
 * SimpleRegisterPage - Simplified Registration Page
 *
 * Alternative registration page with simplified layout and branding
 * for streamlined user onboarding experience.
 *
 * @component
 * @example
 * // Usage in router for simplified registration flow
 * <Route path="/simple-register" element={<SimpleRegisterPage />} />
 *
 * @features
 * - Simplified, clean layout design
 * - FloWorx branding with tagline
 * - Responsive design optimized for mobile
 * - Minimal distractions for focused registration
 * - Professional footer with copyright
 * - Tailwind CSS styling for modern appearance
 * - Hot tub industry-specific messaging
 *
 * @dependencies
 * - SimpleRegisterForm: Simplified registration form component
 * - Tailwind CSS: Utility-first CSS framework for styling
 *
 * @note Alternative to RegisterPage.jsx with different styling approach
 */
const SimpleRegisterPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600 text-white text-xl font-bold mb-4">
            F
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FloWorx</h1>
          <p className="text-gray-600">Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
        </div>
      </div>

      {/* Registration Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <SimpleRegisterForm />
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          © 2024 FloWorx. Email AI for Hot Tub Professionals.
        </p>
      </div>
    </div>
  );
};

export default SimpleRegisterPage;
