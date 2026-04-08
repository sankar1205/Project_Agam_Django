import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Container, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { API_BASE } from '../config';

export default function TherapistLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.role !== 'therapist') {
          setError('Unauthorized: Not a therapist account.');
          return;
        }
        login(data.access);
        navigate('/therapist');
      } else {
        setError(data.detail || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
      <Container maxWidth="xs">
        <Paper elevation={24} sx={{ p: 5, borderRadius: 4, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
          <Box textAlign="center" mb={3}>
             <img src="/WhatsApp Image 2026-03-22 at 20.46.56.jpeg" alt="Logo" style={{ height: '40px', marginBottom: '10px' }} />
             <Typography variant="h4" fontWeight="bold" color="#1e3c72" mb={1}>
               Therapist Login
             </Typography>
             <Typography variant="body2" color="text.secondary">
               Access your clinical dashboard securely.
             </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField 
              fullWidth label="Email Address" variant="outlined" margin="normal"
              value={email} onChange={e => setEmail(e.target.value)} required 
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <TextField 
              fullWidth label="Password" type="password" variant="outlined" margin="normal"
              value={password} onChange={e => setPassword(e.target.value)} required 
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <Button 
              fullWidth type="submit" variant="contained" size="large"
              sx={{ mt: 3, mb: 2, borderRadius: 2, py: 1.5, background: 'linear-gradient(45deg, #1e3c72, #2a5298)', boxShadow: '0 4px 14px 0 rgba(30, 60, 114, 0.39)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
            >
              Sign In
            </Button>
            <Box textAlign="center" mt={2}>
              <Typography variant="body2">
                Don't have an account? <Link to="/therapist/signup" style={{ color: '#1e3c72', fontWeight: 600, textDecoration: 'none' }}>Apply Now</Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
