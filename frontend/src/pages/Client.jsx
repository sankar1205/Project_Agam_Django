import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';

// MUI
import {
  Box,
  Typography,
  Container,
  Grid,
  Grow
} from '@mui/material';

// Icons
import AdjustIcon from '@mui/icons-material/Adjust';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';

// Components
import GroundingToolkit from '../components/GroundingToolkit';

const panelBase = {
  position: 'relative',
  height: 380,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '32px',
  p: 5,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
  '&:active': { transform: 'translateY(0px) scale(0.98)' }
};



export default function Client() {
  const { patientId } = useParams();
  const id = Number(patientId || 1);
  const navigate = useNavigate();

  const [clientName, setClientName] = useState('...');
  const [groundingOpen, setGroundingOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/patients`)
      .then(res => res.json())
      .then(data => {
        const c = data.patients.find(p => p.id === id);
        if (c) setClientName(c.name);
      })
      .catch(e => console.error(e));
  }, [id]);

  return (
    <Box sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      pt: { xs: 8, md: 12 },
      pb: { xs: 8, md: 12 }
    }}>
      {/* Grounding Toolkit Modal */}
      <GroundingToolkit
        open={groundingOpen}
        onClose={() => setGroundingOpen(false)}
        patientId={id}
      />

      <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>

        {/* Header / Welcome Area */}
        <Box sx={{ mb: 8, px: { xs: 2, md: 4 } }}>
          <Grow in timeout={800}>
            <Typography variant="h2" sx={{
              fontWeight: 200,
              color: '#064e3b',
              letterSpacing: '-0.03em',
              mb: 2,
              textShadow: '0 4px 16px rgba(21,128,61,0.08)'
            }}>
              Welcome back, <Box component="span" sx={{ fontWeight: 500, color: '#15803d' }}>{clientName}</Box>
            </Typography>
          </Grow>
          <Grow in timeout={1200}>
            <Typography variant="h6" sx={{ color: '#166634', fontWeight: 300, maxWidth: '600px', lineHeight: 1.7, opacity: 0.85 }}>
              Take a deep breath. You are in a safe space. Whenever you are ready, choose how you'd like to spend your time today.
            </Typography>
          </Grow>

          {/* Gentle grounding link — unobtrusive, supportive */}
          <Grow in timeout={1600}>
            <Box
              onClick={() => setGroundingOpen(true)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                mt: 3,
                px: 2,
                py: 1,
                borderRadius: '100px',
                border: '1px solid rgba(34,197,94,0.2)',
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.75)',
                  borderColor: 'rgba(34,197,94,0.4)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 14px rgba(34,197,94,0.1)'
                }
              }}
            >
              <SpaRoundedIcon sx={{ fontSize: 16, color: '#4b7a5e', opacity: 0.8 }} />
              <Typography sx={{ fontSize: '0.8rem', color: '#4b7a5e', fontWeight: 500, letterSpacing: '0.01em' }}>
                Need a moment? Try the grounding toolkit
              </Typography>
            </Box>
          </Grow>
        </Box>

        {/* White Glassmorphism Panels */}
        <Grid container spacing={6} sx={{ px: { xs: 2, md: 4 } }}>

          {/* Talk with Agam Panel */}
          <Grid item xs={12} md={6}>
            <Grow in timeout={1200}>
              <Box
                onClick={() => navigate(`/client/${id}/chat`)}
                sx={{
                  ...panelBase,
                  background: 'rgba(255, 255, 255, 0.65)',
                  border: '1px solid rgba(34, 197, 94, 0.22)',
                  boxShadow: '0 8px 32px rgba(21, 128, 61, 0.07)',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 28px 56px rgba(21, 128, 61, 0.16)',
                    borderColor: 'rgba(34, 197, 94, 0.4)'
                  },
                  '&:active': { transform: 'translateY(0px) scale(0.98)' }
                }}
              >
                <Box>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e, #15803d)',
                    boxShadow: '0 6px 18px rgba(34,197,94,0.3)',
                    mb: 3
                  }}>
                    <AdjustIcon sx={{ fontSize: 28, color: '#ffffff' }} />
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 300, letterSpacing: '-0.02em', mb: 1, color: '#064e3b' }}>
                    Talk with Agam
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 300, maxWidth: '90%', lineHeight: 1.7, color: '#166534', opacity: 0.85 }}>
                    Your personal guide is here to listen, offer a calming perspective, and help you process your thoughts.
                  </Typography>
                </Box>
                <Box sx={{ alignSelf: 'flex-start' }}>
                  <Typography variant="button" sx={{ fontWeight: 500, letterSpacing: '0.05em', borderBottom: '2px solid rgba(22,163,74,0.5)', pb: 0.5, color: '#16a34a' }}>
                    Open Conversation
                  </Typography>
                </Box>
              </Box>
            </Grow>
          </Grid>

          {/* Smart Journal Panel */}
          <Grid item xs={12} md={6}>
            <Grow in timeout={1500}>
              <Box
                onClick={() => navigate(`/client/${id}/journal`)}
                sx={{
                  ...panelBase,
                  background: 'rgba(240, 253, 244, 0.6)',
                  border: '1px solid rgba(34, 197, 94, 0.15)',
                  boxShadow: '0 8px 32px rgba(21, 128, 61, 0.04)',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                    background: 'rgba(240, 253, 244, 0.85)',
                    boxShadow: '0 28px 56px rgba(21, 128, 61, 0.12)',
                    borderColor: 'rgba(34, 197, 94, 0.3)'
                  },
                  '&:active': { transform: 'translateY(0px) scale(0.98)' }
                }}
              >
                <Box>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #86efac, #22c55e)',
                    boxShadow: '0 6px 18px rgba(34,197,94,0.2)',
                    mb: 3
                  }}>
                    <AutoAwesomeIcon sx={{ fontSize: 26, color: '#fff' }} />
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 300, letterSpacing: '-0.02em', mb: 1, opacity: 0.9, color: '#064e3b' }}>
                    Smart Journal
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 300, maxWidth: '90%', lineHeight: 1.7, color: '#166534', opacity: 0.8 }}>
                    Reflect on your day, track your mood, and write down what matters to you in a safe space.
                  </Typography>
                </Box>
                <Box sx={{ alignSelf: 'flex-start' }}>
                  <Typography variant="button" sx={{ fontWeight: 500, letterSpacing: '0.05em', borderBottom: '2px solid rgba(21,128,61,0.4)', pb: 0.5, color: '#15803d', opacity: 0.9 }}>
                    Start Writing
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
