import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Critical components loaded immediately
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Logo } from './components/ui';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { ToastProvider } from './contexts/ToastContext';
// Lazy-loaded components for better performance
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const DatabaseTest = React.lazy(() => import('./components/DatabaseTest'));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const AccountRecoveryDashboard = React.lazy(() => import('./components/recovery/AccountRecoveryDashboard'));
const NotFoundPage = React.lazy(() => import('./components/NotFoundPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const UserManagement = React.lazy(() => import('./components/UserManagement'));
const Settings = React.lazy(() => import('./components/Settings'));
const APITestDashboard = React.lazy(() => import('./components/APITestDashboard'));
const OnboardingWizard = React.lazy(() => import('./components/OnboardingWizard'));
const OAuthCallback = React.lazy(() => import('./components/oauth/OAuthCallback'));
import './App.css';
// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4" />
      <p className="text-ink-sub">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <ToastProvider>
          <AuthProvider>
            <Router>
              <>
                <div className='App'>
                <header className='App-header'>
                  <div className='flex items-center justify-center space-x-4'>
                    <Logo
                      variant='white-on-blue'
                      size='small'
                      alt='FloWorx - Email AI for Hot Tub Professionals'
                    />
                    <div className='text-center'>
                      <h1 className='text-3xl font-bold'>FloWorx</h1>
                      <p className='text-lg opacity-90'>Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
                    </div>
                  </div>
                </header>

                <main className='App-main'>
                  <Routes>
                    {/* Critical routes - no Suspense delay */}
                    <Route
                      path='/login'
                      element={
                        <ErrorBoundary key='login'>
                          <LoginPage />
                        </ErrorBoundary>
                      }
                    />

                    {/* Lazy-loaded routes with Suspense */}
                    <Route
                      path='/register'
                      element={
                        <ErrorBoundary key='register'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <RegisterPage />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/verify-email'
                      element={
                        <ErrorBoundary key='verify-email'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <VerifyEmailPage />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/forgot-password'
                      element={
                        <ErrorBoundary key='forgot-password'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <ForgotPasswordPage />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/reset-password'
                      element={
                        <ErrorBoundary key='reset-password'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <ResetPasswordPage />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/account-recovery'
                      element={
                        <ErrorBoundary key='account-recovery'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <AccountRecoveryDashboard />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/database-test'
                      element={
                        <ErrorBoundary key='database-test'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <DatabaseTest />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/api-test'
                      element={
                        <ErrorBoundary key='api-test'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <APITestDashboard />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />

                    {/* Protected routes with Suspense */}
                    <Route
                      path='/dashboard'
                      element={
                        <ErrorBoundary key='dashboard'>
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingSpinner />}>
                              <Dashboard />
                            </Suspense>
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/user-management'
                      element={
                        <ErrorBoundary key='user-management'>
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingSpinner />}>
                              <UserManagement />
                            </Suspense>
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/settings'
                      element={
                        <ErrorBoundary key='settings'>
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingSpinner />}>
                              <Settings />
                            </Suspense>
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/onboarding'
                      element={
                        <ErrorBoundary key='onboarding'>
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingSpinner />}>
                              <OnboardingWizard />
                            </Suspense>
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />

                    {/* OAuth Callback Route */}
                    <Route
                      path='/oauth/callback'
                      element={
                        <ErrorBoundary key='oauth-callback'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <OAuthCallback />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />

                    {/* Default redirect */}
                    <Route path='/' element={<Navigate to='/dashboard' replace />} />
                    <Route
                      path='*'
                      element={
                        <ErrorBoundary key='not-found'>
                          <Suspense fallback={<LoadingSpinner />}>
                            <NotFoundPage />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                  </Routes>
                </main>

                <footer className='App-footer'>
                  <p>&copy; 2024 FloWorx. Email AI for Hot Tub Professionals.</p>
                </footer>
              </div>
            </>
            </Router>
          </AuthProvider>
        </ToastProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
