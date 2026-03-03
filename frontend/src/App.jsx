import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { ToastProvider } from './components/Toast';

// Pages
const AuthPage     = lazy(() => import('./pages/AuthPage'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const QualPage     = lazy(() => import('./pages/QualPage'));
const ListingsPage = lazy(() => import('./pages/ListingsPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const DocumentsPage= lazy(() => import('./pages/DocumentsPage'));
const ChatPage     = lazy(() => import('./pages/ChatPage'));
const Layout       = lazy(() => import('./components/Layout'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppLoader() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'linear-gradient(135deg, #0071e3, #30d158)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>🚪</div>
      <div className="spinner spinner-lg" />
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="qualify" element={<QualPage />} />
          <Route path="listings" element={<ListingsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
