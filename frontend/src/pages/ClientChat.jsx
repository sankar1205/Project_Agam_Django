import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';

// MUI
import {
  Box,
  Container,
  Typography,
  TextField,
  IconButton,
  Grow,
  Avatar
} from '@mui/material';

// Icons
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import AdjustIcon from '@mui/icons-material/Adjust';

// A dynamic injected style block for soothing animations
const globalStyles = `
  @keyframes sereneBg {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes breathing {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
    50% { transform: scale(1.02); box-shadow: 0 0 20px 8px rgba(34, 197, 94, 0.1); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }
  @keyframes pulseSoft {
    0% { opacity: 0.7; transform: scale(0.98); }
    50% { opacity: 1; transform: scale(1.02); filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.4)); }
    100% { opacity: 0.7; transform: scale(0.98); }
  }
  @keyframes floatUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default function ClientChat() {
  const { patientId } = useParams();
  const id = Number(patientId || 1);
  const navigate = useNavigate();

  // Chat State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');
  const [isHoveringInput, setIsHoveringInput] = useState(false);
  
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const liveRef = useRef(null);

  useEffect(() => { 
    loadHistory(); 
  }, [id]);

  async function loadHistory() {
    try {
      setStatus('Loading context...');
      const r = await fetch(`${API_BASE}/history/${id}`);
      if (!r.ok) throw new Error('Failed to load history');
      const body = await r.json();
      const mapped = body.history.map(h => ({ role: h.role, text: h.content }));
      setMessages(mapped);
      setStatus('');
      if (liveRef.current) { liveRef.current.textContent = `Loaded ${mapped.length} messages`; }
      setTimeout(() => inputRef.current?.focus(), 120);
    } catch (e) {
      setStatus('');
    }
  }

  function appendHuman(text) {
    setMessages(prev => [...prev, { role: 'human', text }]);
  }
  function appendAI(text) {
    setMessages(prev => [...prev, { role: 'ai', text }]);
  }

  useEffect(() => { 
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, status]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    appendHuman(text);
    setInput('');
    setStatus('Thinking...');
    try {
      const r = await fetch(`${API_BASE}/chat`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ patient_id: id, message: text }) 
      });
      if (!r.ok) throw new Error('Server error');
      await loadHistory();
      setStatus('');
      if (liveRef.current) { liveRef.current.textContent = 'Message sent'; }
      setTimeout(() => inputRef.current?.focus(), 120);
    } catch (e) {
      appendAI('Error from server');
      setStatus('');
      if (liveRef.current) { liveRef.current.textContent = 'Failed to send message'; }
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault(); 
      send();
    }
  }

  return (
    <Box sx={{ 
      // Immersive fixed overlay over the whole screen
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 100,
      
      // Calming white & green moving background
      background: 'linear-gradient(-45deg, #f8fafc, #f0fdf4, #e2e8f0, #dcfce7)',
      backgroundSize: '400% 400%',
      animation: 'sereneBg 20s ease infinite',
      
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      pt: { xs: 2, md: 4 }, 
      pb: { xs: 2, md: 6 },
      px: { xs: 2, md: 4 }
    }}>
      <style>{globalStyles}</style>

      <Container maxWidth="md" sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        // White Glassmorphism 
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: '32px',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 32px 80px rgba(21, 128, 61, 0.08)',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <Box sx={{ 
          px: 4, 
          py: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid rgba(34, 197, 94, 0.15)',
          background: 'rgba(255, 255, 255, 0.4)'
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton 
              onClick={() => navigate(`/client/${id}`)}
              sx={{ 
                color: '#166534', 
                background: 'rgba(34,197,94,0.05)',
                transition: 'all 0.3s ease',
                '&:hover': { background: 'rgba(34,197,94,0.15)', transform: 'translateX(-2px)' } 
              }}
            >
              <ArrowBackIosNewRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Box display="flex" alignItems="center" gap={2}>
              {/* Dynamic Agam Icon */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #15803d)',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                animation: 'pulseSoft 4s ease-in-out infinite'
              }}>
                <AdjustIcon sx={{ fontSize: 24, color: '#ffffff' }} />
              </Box>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#064e3b', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                  AGAM
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 500, opacity: 0.8, letterSpacing: '0.03em', display: 'block' }}>
                  {status ? status : 'Online, ready to listen'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* live region for screen readers */}
        <div aria-live="polite" aria-atomic="true" ref={liveRef} style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }} />

        {/* Chat Log */}
        <Box ref={chatRef} sx={{ 
          flex: 1, 
          overflow: 'auto', 
          px: { xs: 3, md: 5 }, 
          py: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 3 
        }} role="log" aria-live="polite" aria-atomic="false" tabIndex={0}>
          
          {messages.length === 0 && (
            <Box sx={{ m: 'auto', textAlign: 'center', animation: 'floatUp 1s ease' }}>
              <Box sx={{
                width: 80, height: 80, 
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 3,
                animation: 'breathing 6s ease-in-out infinite'
              }}>
                <AdjustIcon sx={{ fontSize: 40, color: '#22c55e', opacity: 0.8 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 500, color: '#064e3b', mb: 1 }}>
                Welcome to your safe space.
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 400, color: '#166534', opacity: 0.8 }}>
                Take a deep breath. Share whatever is on your mind.
              </Typography>
            </Box>
          )}

          {messages.map((m, i) => (
            <Grow in key={i} timeout={600}>
              <Box sx={{ display: 'flex', flexDirection: m.role === 'human' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 2 }}>
                
                {/* Avatar for Human */}
                {m.role === 'human' && (
                  <Avatar sx={{ 
                    width: 36, height: 36, 
                    background: '#ffffff', 
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                  }}>
                    <AccountCircleRoundedIcon sx={{ fontSize: 30, color: '#94a3b8' }} />
                  </Avatar>
                )}
                
                {/* Avatar for AI */}
                {m.role === 'ai' && (
                  <Avatar sx={{ 
                    width: 36, height: 36, 
                    background: 'linear-gradient(135deg, #22c55e, #15803d)', 
                    boxShadow: '0 4px 12px rgba(34,197,94,0.2)',
                  }}>
                    <AdjustIcon sx={{ fontSize: 22, color: '#ffffff' }} />
                  </Avatar>
                )}

                <Box
                  sx={{
                    maxWidth: '80%',
                    px: { xs: 2.5, md: 3 },
                    py: 2,
                    background: m.role === 'human' ? '#ffffff' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    border: '1px solid',
                    borderColor: m.role === 'human' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: m.role === 'human' ? '#1e293b' : '#064e3b',
                    borderRadius: m.role === 'human' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                    boxShadow: m.role === 'human' 
                      ? '0 8px 24px rgba(0,0,0,0.03)' 
                      : '0 8px 24px rgba(34,197,94,0.08)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: m.role === 'human' 
                        ? '0 12px 28px rgba(0,0,0,0.06)' 
                        : '0 12px 28px rgba(34,197,94,0.15)',
                    }
                  }}
                >
                  <Typography variant="body1" sx={{ 
                    fontWeight: m.role === 'human' ? 400 : 500, 
                    lineHeight: 1.6, 
                    fontSize: { xs: '0.95rem', md: '1.05rem' } 
                  }}>
                    {m.text}
                  </Typography>
                </Box>
              </Box>
            </Grow>
          ))}

          {/* Calming thinking indicator */}
          {status === 'Thinking...' && (
            <Grow in timeout={400}>
               <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 2, mt: 1 }}>
                <Avatar sx={{ 
                  width: 36, height: 36, 
                  background: 'linear-gradient(135deg, #22c55e, #15803d)', 
                  boxShadow: '0 4px 12px rgba(34,197,94,0.2)',
                  animation: 'breathing 2s infinite'
                }}>
                  <AdjustIcon sx={{ fontSize: 22, color: '#ffffff' }} />
                </Avatar>
                <Box sx={{
                    px: 3, py: 2.5,
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '24px 24px 24px 4px',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                   <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulseSoft 1.5s infinite 0.1s' }} />
                   <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulseSoft 1.5s infinite 0.3s' }} />
                   <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulseSoft 1.5s infinite 0.5s' }} />
                </Box>
              </Box>
            </Grow>
          )}

        </Box>

        {/* Chat Input */}
        <Box sx={{ 
          p: { xs: 3, md: 4 }, 
          background: 'rgba(255, 255, 255, 0.6)', 
          borderTop: '1px solid rgba(34,197,94,0.1)' 
        }}>
          <Box 
            component="form" 
            onSubmit={(e) => { e.preventDefault(); send(); }} 
            onMouseEnter={() => setIsHoveringInput(true)}
            onMouseLeave={() => setIsHoveringInput(false)}
            sx={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: '800px', 
              mx: 'auto' 
            }}
          >
            <TextField
              aria-label="Message input"
              inputRef={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Gently express your thoughts..."
              fullWidth
              multiline
              maxRows={5}
              minRows={1}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: '28px',
                  backgroundColor: '#ffffff',
                  color: '#064e3b',
                  px: 4,
                  py: 2.5,
                  pr: 9,
                  fontSize: '1.05rem',
                  fontWeight: 400,
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  boxShadow: isHoveringInput 
                    ? '0 12px 32px rgba(34, 197, 94, 0.12)' 
                    : '0 8px 24px rgba(0,0,0,0.04)',
                  '& fieldset': { 
                    border: '1px solid rgba(34,197,94,0.15)',
                    transition: 'all 0.3s ease'
                  },
                  '&:hover fieldset': { 
                    borderColor: 'rgba(34,197,94,0.3)' 
                  },
                  '&.Mui-focused fieldset': { 
                    borderColor: '#22c55e', 
                    borderWidth: '2px',
                    boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.1)'
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#15803d',
                  opacity: 0.5,
                  fontWeight: 300,
                }
              }}
            />
            {/* Dynamic Send Button */}
            <Grow in={true}>
               <IconButton 
                  type="submit" 
                  disabled={!input.trim() || status === 'Thinking...'}
                  sx={{ 
                    position: 'absolute', 
                    right: 8, 
                    bottom: 8, 
                    backgroundColor: input.trim() ? '#16a34a' : 'transparent',
                    color: input.trim() ? '#ffffff' : 'rgba(34,197,94,0.4)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    width: 46,
                    height: 46,
                    boxShadow: input.trim() ? '0 8px 20px rgba(22, 163, 74, 0.3)' : 'none',
                    '&:hover': { 
                      backgroundColor: input.trim() ? '#15803d' : 'transparent',
                      transform: input.trim() ? 'scale(1.05) translateY(-2px)' : 'none',
                      boxShadow: input.trim() ? '0 12px 24px rgba(22, 163, 74, 0.4)' : 'none',
                    },
                    '&:active': {
                      transform: input.trim() ? 'scale(0.95)' : 'none',
                    }
                  }}
                >
                  <SendRoundedIcon sx={{ 
                    fontSize: 22, 
                    transform: input.trim() ? 'translate(2px, -2px)' : 'none', 
                    transition: 'transform 0.3s ease' 
                  }} />
                </IconButton>
            </Grow>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
