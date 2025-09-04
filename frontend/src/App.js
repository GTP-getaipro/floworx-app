import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './components/Dashboard';
import DatabaseTest from './components/DatabaseTest';
import EmailVerification from './components/EmailVerification';
import ErrorBoundary from './components/ErrorBoundary';
import ForgotPassword from './components/ForgotPassword';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AccountRecoveryDashboard from './components/recovery/AccountRecoveryDashboard';
import NotFoundPage from './components/NotFoundPage';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <AuthProvider>
          <Router>
            <>
              <div className='App'>
                <header className='App-header'>
                  <h1>FloWorx</h1>
                  <p>Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
                </header>

                <main className='App-main'>
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
                </main>

                <footer className='App-footer'>
                  <p>&copy; 2024 FloWorx. Email AI for Hot Tub Professionals.</p>
                </footer>
              </div>
            </>
          </Router>
        </AuthProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
