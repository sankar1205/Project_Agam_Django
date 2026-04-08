import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, IconButton, Grow } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LocalPhoneRoundedIcon from '@mui/icons-material/LocalPhoneRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';

// ─── Breathing phases for 4-7-8 technique ────────────────────────────────────
const PHASES = [
  { label: 'Inhale',  duration: 4, scale: 1.35, color: '#22c55e', hint: 'Breathe in slowly through your nose' },
  { label: 'Hold',    duration: 7, scale: 1.35, color: '#86efac', hint: 'Hold your breath gently'              },
  { label: 'Exhale',  duration: 8, scale: 0.85, color: '#6ee7b7', hint: 'Breathe out slowly through your mouth' },
];

// ─── 5-4-3-2-1 Grounding prompts ─────────────────────────────────────────────
const GROUNDING_STEPS = [
  {
    n: 5, sense: 'See',
    color: '#bbf7d0', border: '#22c55e',
    items: ['Something green', 'Something square', 'Something that moves', 'A light source', 'Your own hands'],
  },
  {
    n: 4, sense: 'Touch',
    color: '#d1fae5', border: '#10b981',
    items: ['The ground beneath your feet', 'Your clothing fabric', 'The chair or surface you sit on', 'Your own face'],
  },
  {
    n: 3, sense: 'Hear',
    color: '#dcfce7', border: '#16a34a',
    items: ['A distant sound', 'Your own breathing', 'The quietest sound around you'],
  },
  {
    n: 2, sense: 'Smell',
    color: '#ecfdf5', border: '#15803d',
    items: ['Something pleasant nearby', 'The air around you'],
  },
  {
    n: 1, sense: 'Taste',
    color: '#f0fdf4', border: '#166534',
    items: ['Something in your mouth right now'],
  },
];

// ─── Breathing Visualizer ─────────────────────────────────────────────────────
function BreathingVisualizer() {
  const [phase, setPhase] = useState(0);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  const current = PHASES[phase];

  const stop = useCallback(() => {
    setRunning(false);
    clearInterval(timerRef.current);
    setPhase(0);
    setTick(0);
  }, []);

  useEffect(() => {
    if (!running) return;
    setTick(0);
    timerRef.current = setInterval(() => {
      setTick(t => {
        if (t + 1 >= current.duration) {
          setPhase(p => (p + 1) % PHASES.length);
          return 0;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running, phase]);

  const progress = running ? ((tick + 1) / current.duration) * 100 : 0;

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 500, mb: 3, opacity: 0.8 }}>
        4-7-8 Breathing Technique
      </Typography>

      {/* Animated circle */}
      <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
        {/* Outer glow ring */}
        <Box sx={{
          position: 'absolute',
          width: 180, height: 180,
          borderRadius: '50%',
          border: `2px solid ${running ? current.color : '#dcfce7'}`,
          transform: running ? `scale(${current.scale + 0.08})` : 'scale(1)',
          transition: `transform ${running ? current.duration : 0.5}s cubic-bezier(0.4,0,0.2,1)`,
          opacity: 0.5,
        }} />
        {/* Main circle */}
        <Box sx={{
          width: 160, height: 160,
          borderRadius: '50%',
          background: running
            ? `radial-gradient(circle, rgba(34,197,94,0.25) 0%, rgba(22,163,74,0.1) 100%)`
            : 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, rgba(22,163,74,0.03) 100%)',
          border: `2px solid ${running ? current.color : '#bbf7d0'}`,
          transform: running ? `scale(${current.scale})` : 'scale(1)',
          transition: `transform ${running ? current.duration : 0.5}s cubic-bezier(0.4,0,0.2,1), background 0.8s ease, border-color 0.8s ease`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}>
          {running ? (
            <>
              <Typography sx={{ fontSize: '2rem', fontWeight: 300, color: '#064e3b', lineHeight: 1 }}>
                {current.duration - tick}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {current.label}
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: '0.8rem', color: '#15803d', opacity: 0.6, fontWeight: 500 }}>
              Tap to begin
            </Typography>
          )}
        </Box>
      </Box>

      {/* Phase hint */}
      {running && (
        <Typography variant="body2" sx={{ color: '#166534', mb: 3, minHeight: 20, opacity: 0.8 }}>
          {current.hint}
        </Typography>
      )}

      {/* Phase progress pills */}
      {running && (
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 4 }}>
          {PHASES.map((p, i) => (
            <Box key={i} sx={{
              height: 4, borderRadius: 2,
              width: i === phase ? 40 : 16,
              background: i === phase ? '#22c55e' : '#bbf7d0',
              transition: 'all 0.4s ease'
            }} />
          ))}
        </Box>
      )}

      {/* Control buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {!running ? (
          <button
            onClick={() => setRunning(true)}
            style={{
              padding: '10px 32px',
              borderRadius: 100,
              border: 'none',
              background: 'linear-gradient(135deg, #22c55e, #15803d)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(34,197,94,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            Start Breathing
          </button>
        ) : (
          <button
            onClick={stop}
            style={{
              padding: '10px 32px',
              borderRadius: 100,
              border: '1px solid rgba(34,197,94,0.3)',
              background: 'rgba(255,255,255,0.6)',
              color: '#166534',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            Stop
          </button>
        )}
      </Box>
    </Box>
  );
}

// ─── Grounding Checklist ──────────────────────────────────────────────────────
function GroundingChecklist() {
  const [checked, setChecked] = useState({});
  const [activeStep, setActiveStep] = useState(0);

  const step = GROUNDING_STEPS[activeStep];
  const allDone = GROUNDING_STEPS.every((s, si) =>
    s.items.every((_, ii) => checked[`${si}-${ii}`])
  );

  function toggle(stepIdx, itemIdx) {
    const key = `${stepIdx}-${itemIdx}`;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const stepComplete = (si) => GROUNDING_STEPS[si].items.every((_, ii) => checked[`${si}-${ii}`]);

  return (
    <Box>
      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 500, mb: 3, opacity: 0.8 }}>
        Tap each item as you acknowledge it to anchor yourself to the present moment.
      </Typography>

      {/* Step selector */}
      <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap' }}>
        {GROUNDING_STEPS.map((s, si) => (
          <button
            key={si}
            onClick={() => setActiveStep(si)}
            style={{
              padding: '6px 16px',
              borderRadius: 100,
              border: `1.5px solid ${stepComplete(si) ? '#22c55e' : activeStep === si ? '#16a34a' : '#bbf7d0'}`,
              background: stepComplete(si) ? '#dcfce7' : activeStep === si ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.6)',
              color: stepComplete(si) ? '#15803d' : activeStep === si ? '#064e3b' : '#4b7a5e',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {stepComplete(si) ? '✓ ' : ''}{s.n} {s.sense}
          </button>
        ))}
      </Box>

      {/* Items for active step */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography sx={{ fontWeight: 600, color: '#064e3b', mb: 1 }}>
          Name {step.n} thing{step.n > 1 ? 's' : ''} you can <em>{step.sense.toLowerCase()}</em>:
        </Typography>
        {step.items.map((item, ii) => {
          const key = `${activeStep}-${ii}`;
          const done = checked[key];
          return (
            <Box
              key={ii}
              onClick={() => toggle(activeStep, ii)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 3,
                border: `1.5px solid ${done ? '#22c55e' : 'rgba(34,197,94,0.2)'}`,
                background: done ? 'linear-gradient(135deg, #dcfce7, #f0fdf4)' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                transform: done ? 'translateX(4px)' : 'none',
                boxShadow: done ? '0 4px 12px rgba(34,197,94,0.12)' : 'none',
                '&:hover': { background: done ? 'linear-gradient(135deg, #dcfce7, #f0fdf4)' : '#f8fafc' }
              }}
            >
              <Box sx={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${done ? '#22c55e' : '#bbf7d0'}`,
                background: done ? '#22c55e' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.25s',
              }}>
                {done && <Box sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>✓</Box>}
              </Box>
              <Typography variant="body2" sx={{
                color: done ? '#064e3b' : '#4b7a5e',
                fontWeight: done ? 600 : 400,
                textDecoration: done ? 'none' : 'none',
                transition: 'all 0.25s',
              }}>
                {item}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {allDone && (
        <Grow in timeout={500}>
          <Box sx={{
            mt: 4, p: 3, borderRadius: 3,
            background: 'linear-gradient(135deg, #dcfce7, #f0fdf4)',
            border: '1.5px solid #22c55e',
            textAlign: 'center'
          }}>
            <Typography sx={{ color: '#064e3b', fontWeight: 600, fontSize: '1.05rem' }}>
              🌿 Well done.
            </Typography>
            <Typography variant="body2" sx={{ color: '#166534', mt: 0.5 }}>
              You've completed the grounding exercise. Take a moment to notice how you feel.
            </Typography>
          </Box>
        </Grow>
      )}
    </Box>
  );
}

// ─── Emergency Routing ────────────────────────────────────────────────────────
function EmergencyRouting({ patientId }) {
  const [pinged, setPinged] = useState(false);

  function pingTherapist() {
    // In production this would call an API endpoint
    setPinged(true);
    setTimeout(() => setPinged(false), 5000);
  }

  const buttons = [
    {
      icon: <NotificationsActiveRoundedIcon />,
      label: pinged ? 'Therapist Notified ✓' : 'Ping My Therapist',
      sublabel: pinged ? 'Your therapist has been alerted.' : 'Send an immediate alert to your care team',
      bg: pinged ? '#dcfce7' : 'linear-gradient(135deg, #22c55e, #15803d)',
      color: pinged ? '#15803d' : '#fff',
      border: pinged ? '#22c55e' : 'transparent',
      onClick: pingTherapist,
    },
    {
      icon: <LocalPhoneRoundedIcon />,
      label: 'Crisis Helpline',
      sublabel: 'iCall India: 9152987821 · Vandrevala: 1860-2662-345',
      bg: 'rgba(255,255,255,0.7)',
      color: '#064e3b',
      border: 'rgba(34,197,94,0.3)',
      onClick: () => { if (confirm('Call iCall crisis support at 9152987821?')) window.location.href = 'tel:9152987821'; },
    },
    {
      icon: <FavoriteRoundedIcon />,
      label: 'Contact Trusted Person',
      sublabel: 'Reach out to a friend or family member right now',
      bg: 'rgba(255,255,255,0.7)',
      color: '#064e3b',
      border: 'rgba(34,197,94,0.3)',
      onClick: () => alert('Open your contacts and reach out to someone you trust. You are not alone.'),
    },
  ];

  return (
    <Box>
      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 500, mb: 3, opacity: 0.8 }}>
        You don't have to go through this alone. Reach out immediately.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {buttons.map((b, i) => (
          <button
            key={i}
            onClick={b.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '18px 22px',
              borderRadius: 18,
              border: `1.5px solid ${b.border}`,
              background: b.bg,
              color: b.color,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.25s ease',
              boxShadow: i === 0 ? '0 8px 24px rgba(34,197,94,0.25)' : '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <Box sx={{ fontSize: 26, display: 'flex', opacity: 0.9 }}>{b.icon}</Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'inherit', lineHeight: 1.3 }}>
                {b.label}
              </Typography>
              <Typography sx={{ fontWeight: 400, fontSize: '0.8rem', color: 'inherit', opacity: 0.75, mt: 0.3, lineHeight: 1.4 }}>
                {b.sublabel}
              </Typography>
            </Box>
          </button>
        ))}
      </Box>
    </Box>
  );
}

// ─── Main GroundingToolkit component ─────────────────────────────────────────
const TABS = ['🌬 Breathe', '🌿 Ground', '🆘 Help'];

export default function GroundingToolkit({ open, onClose, patientId }) {
  const [tab, setTab] = useState(0);

  // Reset to breathe tab when opened
  useEffect(() => {
    if (open) setTab(0);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(6, 78, 59, 0.35)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <Grow in={open} timeout={350}>
        <Box sx={{
          position: 'relative',
          width: '100%', maxWidth: 580,
          maxHeight: '92vh',
          overflowY: 'auto',
          mx: { xs: 2, md: 0 },
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '32px',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          boxShadow: '0 40px 100px rgba(21, 128, 61, 0.18)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <Box sx={{
            px: 4, pt: 4, pb: 2,
            borderBottom: '1px solid rgba(34, 197, 94, 0.12)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.5)',
            position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(16px)'
          }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#064e3b', letterSpacing: '-0.01em' }}>
                Grounding Toolkit
              </Typography>
              <Typography variant="body2" sx={{ color: '#15803d', mt: 0.5, opacity: 0.8 }}>
                You are safe. Let's take this one step at a time.
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              aria-label="Close"
              sx={{
                color: '#166534',
                background: 'rgba(34,197,94,0.08)',
                '&:hover': { background: 'rgba(34,197,94,0.15)' },
                mt: -0.5
              }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Box>

          {/* Tab Bar */}
          <Box sx={{ display: 'flex', px: 4, pt: 3, pb: 0, gap: 1.5 }}>
            {TABS.map((t, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 100,
                  border: tab === i ? '1.5px solid #22c55e' : '1.5px solid rgba(34,197,94,0.15)',
                  background: tab === i ? 'linear-gradient(135deg, #22c55e14, #dcfce7)' : 'rgba(255,255,255,0.5)',
                  color: tab === i ? '#064e3b' : '#4b7a5e',
                  fontWeight: tab === i ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {t}
              </button>
            ))}
          </Box>

          {/* Tab Content */}
          <Box sx={{ px: 4, py: 4 }}>
            {tab === 0 && <BreathingVisualizer />}
            {tab === 1 && <GroundingChecklist />}
            {tab === 2 && <EmergencyRouting patientId={patientId} />}
          </Box>

          {/* Footer note */}
          <Box sx={{
            px: 4, py: 2.5,
            borderTop: '1px solid rgba(34,197,94,0.1)',
            background: 'rgba(240,253,244,0.4)',
          }}>
            <Typography variant="caption" sx={{ color: '#15803d', opacity: 0.7 }}>
              This toolkit provides immediate coping support. If you are in danger, call 112 (India) or your local emergency services immediately.
            </Typography>
          </Box>
        </Box>
      </Grow>
    </Box>
  );
}
