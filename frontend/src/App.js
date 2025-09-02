import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import EmailVerification from './components/EmailVerification';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import AccountRecoveryDashboard from './components/recovery/AccountRecoveryDashboard';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  return (
    <ErrorProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <header className="App-header">
              <h1>FloWorx</h1>
              <p>Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
            </header>
          
          <main className="App-main">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/account-recovery" element={<AccountRecoveryDashboard />} />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          
          <footer className="App-footer">
            <p>&copy; 2024 FloWorx. Email AI for Hot Tub Professionals.</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
    </ErrorProvider>
  );
}

export default App;
