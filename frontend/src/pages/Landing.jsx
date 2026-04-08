import React from 'react';
import { Link } from 'react-router-dom';

// MUI Components
import {
  Box,
  Container,
  Typography,
  Grid,
  Grow,
} from '@mui/material';

// Icons
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PsychologyIcon from '@mui/icons-material/Psychology';

export default function Landing() {
  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 4,
      }}
    >
      <Container maxWidth="md">
        <Grow in timeout={800}>
          <Box>
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 300,
                letterSpacing: '-0.02em',
                mb: 2,
                color: '#064e3b',
                textShadow: '0 4px 24px rgba(21, 128, 61, 0.08)'
              }}
            >
              Welcome to{' '}
              <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 200, opacity: 0.8, color: '#15803d' }}>
                AGAM.
              </Box>
            </Typography>
            <Typography
              variant="h6"
              sx={{ mb: 8, fontWeight: 300, maxWidth: '600px', mx: 'auto', color: '#166534', opacity: 0.85, lineHeight: 1.7 }}
            >
              A guided therapeutic platform bridging the gap between innovative AI assistance and professional therapist management.
            </Typography>
          </Box>
        </Grow>

        <Grid container spacing={4} justifyContent="center" sx={{ px: { xs: 2, md: 4 } }}>
          
          {/* Client View Panel */}
          <Grid item xs={12} sm={6}>
            <Grow in timeout={1200}>
              <Box
                component={Link}
                to="/client/login"
                sx={{
                  position: 'relative',
                  height: 300,
                  textDecoration: 'none',
                  color: '#064e3b',
                  background: 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '32px',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  boxShadow: '0 8px 32px rgba(21, 128, 61, 0.07)',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 24px 56px rgba(21, 128, 61, 0.18)',
                    borderColor: 'rgba(34, 197, 94, 0.4)'
                  },
                  '&:active': { transform: 'translateY(0px) scale(0.98)' }
                }}
              >
                <Box>
                  <PersonOutlineIcon sx={{ fontSize: 40, color: '#16a34a', mb: 3 }} />
                  <Typography variant="h4" sx={{ fontWeight: 300, letterSpacing: '-0.02em', mb: 1, textAlign: 'left', color: '#064e3b' }}>
                    Client View
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 300, maxWidth: '95%', lineHeight: 1.6, opacity: 0.8, textAlign: 'left', color: '#166534' }}>
                    Chat with AGAM, receive guided responses, and track your therapeutic journey.
                  </Typography>
                </Box>
                <Box sx={{ alignSelf: 'flex-start' }}>
                  <Typography variant="button" sx={{ fontWeight: 500, letterSpacing: '0.05em', borderBottom: '1px solid rgba(22,163,74,0.5)', pb: 0.5, color: '#16a34a' }}>
                    Enter Dashboard
                  </Typography>
                </Box>
              </Box>
            </Grow>
          </Grid>

          {/* Therapist View Panel */}
          <Grid item xs={12} sm={6}>
            <Grow in timeout={1500}>
              <Box
                component={Link}
                to="/therapist/login"
                sx={{
                  position: 'relative',
                  height: 300,
                  textDecoration: 'none',
                  color: '#064e3b',
                  background: 'rgba(240, 253, 244, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '32px',
                  border: '1px solid rgba(34, 197, 94, 0.15)',
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  boxShadow: '0 8px 32px rgba(21, 128, 61, 0.05)',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                    background: 'rgba(240, 253, 244, 0.85)',
                    boxShadow: '0 24px 56px rgba(21, 128, 61, 0.14)',
                    borderColor: 'rgba(34, 197, 94, 0.3)'
                  },
                  '&:active': { transform: 'translateY(0px) scale(0.98)' }
                }}
              >
                <Box>
                  <PsychologyIcon sx={{ fontSize: 40, color: '#15803d', mb: 3, opacity: 0.85 }} />
                  <Typography variant="h4" sx={{ fontWeight: 300, letterSpacing: '-0.02em', mb: 1, opacity: 0.9, textAlign: 'left', color: '#064e3b' }}>
                    Therapist View
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 300, maxWidth: '95%', lineHeight: 1.6, opacity: 0.75, textAlign: 'left', color: '#166534' }}>
                    Manage patient sessions, set tones, review insights, and monitor progress.
                  </Typography>
                </Box>
                <Box sx={{ alignSelf: 'flex-start' }}>
                  <Typography variant="button" sx={{ fontWeight: 500, letterSpacing: '0.05em', borderBottom: '1px solid rgba(21,128,61,0.4)', pb: 0.5, color: '#15803d', opacity: 0.9 }}>
                    Access Console
                  </Typography>
                </Box>
              </Box>
            </Grow>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
