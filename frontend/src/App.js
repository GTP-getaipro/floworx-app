import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Critical components loaded immediately
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { Logo } from './components/ui';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { ToastProvider } from './contexts/ToastContext';

// Lazy-loaded components for better performance
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const DatabaseTest = React.lazy(() => import('./components/DatabaseTest'));
const EmailVerification = React.lazy(() => import('./components/EmailVerification'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const AccountRecoveryDashboard = React.lazy(() => import('./components/recovery/AccountRecoveryDashboard'));
const NotFoundPage = React.lazy(() => import('./components/NotFoundPage'));
const Register = React.lazy(() => import('./components/Register'));
const ResetPassword = React.lazy(() => import('./components/ResetPassword'));
const UserManagement = React.lazy(() => import('./components/UserManagement'));
const Settings = React.lazy(() => import('./components/Settings'));

import './App.css';

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
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
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      {/* Public routes with error boundaries */}
                      <Route
                        path='/login'
                        element={
                          <ErrorBoundary key='login'>
                            <Login />
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path='/register'
                        element={
                          <ErrorBoundary key='register'>
                            <Register />
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path='/verify-email'
                      element={
                        <ErrorBoundary key='verify-email'>
                          <EmailVerification />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/forgot-password'
                      element={
                        <ErrorBoundary key='forgot-password'>
                          <ForgotPassword />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/reset-password'
                      element={
                        <ErrorBoundary key='reset-password'>
                          <ResetPassword />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/account-recovery'
                      element={
                        <ErrorBoundary key='account-recovery'>
                          <AccountRecoveryDashboard />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/database-test'
                      element={
                        <ErrorBoundary key='database-test'>
                          <DatabaseTest />
                        </ErrorBoundary>
                      }
                    />

                    {/* Protected routes with error boundaries */}
                    <Route
                      path='/dashboard'
                      element={
                        <ErrorBoundary key='dashboard'>
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/user-management'
                      element={
                        <ErrorBoundary key='user-management'>
                          <ProtectedRoute>
                            <UserManagement />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path='/settings'
                      element={
                        <ErrorBoundary key='settings'>
                          <ProtectedRoute>
                            <Settings />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />

                    {/* Default redirect */}
                    <Route path='/' element={<Navigate to='/dashboard' replace />} />
                    <Route
                      path='*'
                      element={
                        <ErrorBoundary key='not-found'>
                          <NotFoundPage />
                        </ErrorBoundary>
                      }
                    />
                  </Routes>
                  </Suspense>
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
