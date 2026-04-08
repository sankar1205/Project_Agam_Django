import React from 'react'
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Landing from './pages/Landing'
import TherapistDashboard from './pages/TherapistDashboard'
import Client from './pages/Client'
import ClientChat from './pages/ClientChat'
import ClientJournal from './pages/ClientJournal'
import TherapistLogin from './pages/TherapistLogin'
import TherapistSignup from './pages/TherapistSignup'
import ClientLogin from './pages/ClientLogin'
import ClientSignup from './pages/ClientSignup'
import { useAuth } from './contexts/AuthContext'

// MUI components
import { AppBar, Toolbar, Container, Box, Button, Typography, IconButton, Menu, MenuItem } from '@mui/material'

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Premium Glassmorphism Navigation Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #eef5f1',
          color: 'text.primary',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between', minHeight: '70px' }}>

            {/* Brand Logo */}
            <Button
              component={Link}
              to="/"
              disableRipple
              sx={{ p: 0, '&:hover': { background: 'transparent' } }}
            >
              <img
                src="/WhatsApp Image 2026-03-22 at 20.46.56.jpeg"
                alt="AGAM Clinical Companion Logo"
                style={{ height: '40px', width: 'auto' }}
              />
            </Button>

            {/* Navigation Links */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button component={Link} to="/" sx={{ color: location.pathname === '/' ? 'primary.main' : 'text.secondary' }}>
                Home
              </Button>
              
              {!user && (
                <>
                  <Button component={Link} to="/therapist/login" sx={{ color: location.pathname.includes('/therapist') ? 'primary.main' : 'text.secondary' }}>
                    Therapist Portal
                  </Button>
                  <Button component={Link} to="/client/login" sx={{ color: location.pathname.includes('/client') ? 'primary.main' : 'text.secondary' }}>
                    Client Portal
                  </Button>
                </>
              )}

              {user?.role === 'therapist' && (
                <Button component={Link} to="/therapist" sx={{ color: 'primary.main' }}>
                  Dashboard
                </Button>
              )}
              {user?.role === 'client' && user?.patient_id && (
                <Button component={Link} to={`/client/${user.patient_id}`} sx={{ color: 'primary.main' }}>
                  My Space
                </Button>
              )}

              {user && (
                  <Button onClick={handleLogout} sx={{ color: 'error.main', ml: 2, border: '1px solid rgba(211, 47, 47, 0.5)', borderRadius: '20px', px: 2 }}>
                    Logout
                  </Button>
              )}

            </Box>

          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Page Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/therapist/login" element={<TherapistLogin />} />
          <Route path="/therapist/signup" element={<TherapistSignup />} />
          <Route path="/client/login" element={<ClientLogin />} />
          <Route path="/client/signup" element={<ClientSignup />} />

          <Route path="/therapist/*" element={
            <ProtectedRoute allowedRole="therapist">
              <TherapistDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/client/:patientId" element={
            <ProtectedRoute allowedRole="client">
              <Client />
            </ProtectedRoute>
          } />
          <Route path="/client/:patientId/chat" element={
            <ProtectedRoute allowedRole="client">
              <ClientChat />
            </ProtectedRoute>
          } />
          <Route path="/client/:patientId/journal" element={
            <ProtectedRoute allowedRole="client">
              <ClientJournal />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

    </Box>
  )
}