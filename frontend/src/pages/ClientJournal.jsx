import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';

import {
  Box, Typography, Container, Grow, CircularProgress,
  Tooltip, Divider, Collapse, IconButton, Dialog, DialogContent, Slide,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BookIcon from '@mui/icons-material/Book';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';

// ─── Transitions ───────────────────────────────────────────────────────────────
const SlideUp = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

// ─── Constants ────────────────────────────────────────────────────────────────
const NO_DISTORTION_LABELS = ['no distortion', 'none', 'neutral', ''];

const DISTORTION_PALETTE = {
  'All-or-Nothing Thinking':     { fill: '#fbbf24', stroke: '#d97706', text: '#78350f' },
  'Catastrophizing':              { fill: '#f87171', stroke: '#ef4444', text: '#7f1d1d' },
  'Mind Reading':                 { fill: '#a78bfa', stroke: '#7c3aed', text: '#4c1d95' },
  'Emotional Reasoning':          { fill: '#f472b6', stroke: '#db2777', text: '#831843' },
  'Overgeneralization':           { fill: '#fb923c', stroke: '#ea580c', text: '#7c2d12' },
  'Should Statements':            { fill: '#34d399', stroke: '#059669', text: '#064e3b' },
  'Personalization':              { fill: '#60a5fa', stroke: '#2563eb', text: '#1e3a8a' },
  'Mental Filter':                { fill: '#e879f9', stroke: '#a21caf', text: '#4a044e' },
  default:                        { fill: '#fcd34d', stroke: '#d97706', text: '#78350f' },
};

function isDistorted(prediction) {
  if (!prediction) return false;
  return !NO_DISTORTION_LABELS.includes(prediction.toLowerCase().trim());
}

function isQuestion(text) {
  const t = text.trim();
  return t.endsWith('?') || /\?["'"]?\s*$/.test(t);
}

function getPalette(distortionType) {
  return DISTORTION_PALETTE[distortionType] || DISTORTION_PALETTE.default;
}

// ─── LLM Insight Graph (SVG layered DAG) ────────────────────────────────────
function ThoughtGraph({ text, predictions }) {
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    if (!predictions || predictions.length === 0) return;
    const distorted = predictions.filter(p => isDistorted(p.prediction));
    if (distorted.length === 0) return;

    setLoading(true);
    fetch(`${API_BASE}/journal/graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, predictions }),
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.nodes) {
          setGraph(layoutGraph(data));
          // Staggered reveal
          setTimeout(() => setReady(true), 150);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [text, predictions]);

  // Left-to-right layered layout — taller canvas (400px)
  function layoutGraph(data) {
    const W = 720, H = 400;
    const pX = 90, pY = 90;
    const innerW = W - pX * 2;
    const innerH = H - pY - 50;

    const layers = { 0: [], 1: [], 2: [], 3: [] };
    data.nodes.forEach(n => {
      const l = typeof n.layer === 'number' ? n.layer : 1;
      if (layers[l]) layers[l].push({...n});
      else layers[1].push({...n});
    });

    const placedNodes = [];
    const layerIdxs = [0, 1, 2, 3].filter(i => layers[i].length > 0);
    const colSpacing = layerIdxs.length > 1 ? innerW / (layerIdxs.length - 1) : 0;

    const columns = layerIdxs.map((lIdx, c) => {
      const x = pX + c * colSpacing;
      let title = "Thoughts";
      if (lIdx === 0) title = "Beliefs";
      if (lIdx === 2) title = "Emotions";
      if (lIdx === 3) title = "Behaviors";
      return { x, title, id: lIdx };
    });

    layerIdxs.forEach((lIdx, c) => {
      const colNodes = layers[lIdx];
      const rowSpacing = colNodes.length > 1 ? innerH / (colNodes.length - 1) : 0;
      const startY = colNodes.length === 1 ? pY + innerH / 2 : pY;
      colNodes.forEach((n, r) => {
        n.x = pX + c * colSpacing;
        n.y = colNodes.length === 1 ? startY : startY + r * rowSpacing;
        if (colNodes.length > 1) n.y += (Math.random() * 20 - 10);
        n.r = 26;
        n.colIdx = c;
        placedNodes.push(n);
      });
    });

    const byId = Object.fromEntries(placedNodes.map(n => [n.id, n]));
    return { nodes: placedNodes, edges: data.edges, byId, insight: data.insight, columns };
  }

  // Compute point on target node circumference nearest to source
  function edgeEnd(sx, sy, tx, ty, tr, gap = 6) {
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: tx - (dx / dist) * (tr + gap), y: ty - (dy / dist) * (tr + gap) };
  }
  // Compute departure point on source node circumference
  function edgeStart(sx, sy, tx, ty, sr, gap = 6) {
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: sx + (dx / dist) * (sr + gap), y: sy + (dy / dist) * (sr + gap) };
  }

  if (loading) {
    return (
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, border: '1px dashed rgba(251,191,36,0.4)', borderRadius: '24px', background: 'rgba(255,253,245,0.4)' }}>
        <CircularProgress size={28} thickness={4} sx={{ color: '#d97706', opacity: 0.6, mb: 2 }} />
        <Typography sx={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic', letterSpacing: '0.02em' }}>Mapping cause and effect…</Typography>
      </Box>
    );
  }

  if (!graph) return null;

  const getTypeColors = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'belief': return { bg: '#fed7aa', stroke: '#f97316', text: '#9a3412', icon: '💭' }; // orange
      case 'emotion': return { bg: '#fbcfe8', stroke: '#ec4899', text: '#831843', icon: '❤️' }; // pink
      case 'behavior': return { bg: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', icon: '⚡' }; // blue
      case 'thought':
      default: return { bg: '#fef3c7', stroke: '#d97706', text: '#78350f', icon: '🧠' }; // amber
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, px: 1 }}>
        <HubRoundedIcon sx={{ fontSize: 18, color: '#b45309', opacity: 0.85 }} />
        <Typography sx={{ fontWeight: 600, color: '#78350f', fontSize: '1rem', letterSpacing: '-0.01em' }}>Agam's Insight Map</Typography>
      </Box>

      <Box
        sx={{
          borderRadius: '24px',
          background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.9) 0%, rgba(255,253,248,0.95) 100%)',
          border: '1px solid rgba(251,191,36,0.3)',
          overflow: 'hidden',
          opacity: ready ? 1 : 0,
          transform: ready ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 12px 48px rgba(217,119,6,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        {graph.insight && (
          <Box sx={{ px: 3.5, py: 2.5, borderBottom: '1px solid rgba(251,191,36,0.15)', background: 'rgba(253,230,138,0.1)' }}>
            <Typography sx={{ fontSize: '0.98rem', color: '#78350f', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.6, letterSpacing: '-0.01em' }}>
              "{graph.insight}"
            </Typography>
          </Box>
        )}

        <Box sx={{ position: 'relative', width: '100%', pt: '56%' }}>
          <svg
            viewBox="0 0 720 400"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
          >
            <defs>
              {/*
                arrowTip: opaque solid arrowhead.
                viewBox 0 0 12 12, tip at x=11.
                refX=10 aligns tip to path endpoint.
                We compute path endpoints at node circumference so the
                arrowhead is never hidden inside a node circle.
              */}
              <marker id="arrowTip" viewBox="0 0 12 12" refX="10" refY="6"
                markerWidth="9" markerHeight="9" orient="auto-start-reverse">
                <path d="M 0 1.5 L 10.5 6 L 0 10.5 Z" fill="#b45309" opacity="0.95" />
              </marker>
              <filter id="nodeShadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.13" floodColor="#78350f" />
              </filter>
              <filter id="nodeHoverShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.22" floodColor="#b45309" />
              </filter>
              <radialGradient id="nodeGlow" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.88)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            {/* Column lane backgrounds */}
            {graph.columns.map((col, i) => (
              <g key={`col${i}`} style={{ opacity: ready ? 1 : 0, transition: `opacity 0.8s ease ${i * 0.15}s` }}>
                <rect x={col.x - 44} y="14" width="88" height="372" rx="44"
                  fill="rgba(253,230,138,0.07)" stroke="rgba(251,191,36,0.14)" strokeWidth="1" />
                <text x={col.x} y="34" textAnchor="middle"
                  fill="#b45309" fontSize="9.5" fontWeight="700" letterSpacing="0.12em" opacity="0.65">
                  {col.title.toUpperCase()}
                </text>
              </g>
            ))}

            {/* Edges — drawn below nodes */}
            {graph.edges.map((e, i) => {
              const src = graph.byId[e.source], tgt = graph.byId[e.target];
              if (!src || !tgt) return null;

              // Compute endpoints ON the node circumferences (not centres)
              const s = edgeStart(src.x, src.y, tgt.x, tgt.y, src.r);
              const t = edgeEnd(src.x, src.y, tgt.x, tgt.y, tgt.r);
              const midX = (s.x + t.x) / 2;
              // S-curve that departs and arrives horizontally
              const path = `M${s.x},${s.y} C${midX},${s.y} ${midX},${t.y} ${t.x},${t.y}`;
              const lx = (s.x + 2 * midX + t.x) / 4;
              const ly = (s.y + t.y) / 2 - 12;
              const totalLen = 900;

              return (
                <g key={`e${i}`}>
                  {/* Glow halo */}
                  <path d={path} fill="none"
                    stroke="rgba(217,119,6,0.15)" strokeWidth="6"
                    style={{ opacity: ready ? 1 : 0, transition: `opacity 0.5s ease ${0.3 + i * 0.07}s` }}
                  />
                  {/* Main edge cable */}
                  <path
                    d={path} fill="none"
                    stroke="#c2610c" strokeWidth="2.5"
                    strokeLinecap="round"
                    markerEnd="url(#arrowTip)"
                    strokeDasharray={totalLen}
                    strokeDashoffset={ready ? 0 : totalLen}
                    style={{
                      opacity: ready ? 0.85 : 0,
                      transition: `stroke-dashoffset 1.1s cubic-bezier(0.2,0.8,0.2,1) ${0.28 + (tgt.colIdx || 0) * 0.18}s, opacity 0.4s ease ${0.22 + i * 0.07}s`,
                    }}
                  />
                  {/* Relationship label */}
                  {e.label && (
                    <g transform={`translate(${lx},${ly})`}
                      style={{ opacity: ready ? 1 : 0, transition: `opacity 0.5s ease ${0.5 + i * 0.1}s` }}>
                      <rect x="-28" y="-10" width="56" height="20" rx="10"
                        fill="rgba(255,255,255,0.97)" stroke="rgba(194,97,12,0.4)" strokeWidth="1.2" />
                      <text textAnchor="middle" fill="#9a3412" fontSize="9" fontWeight="700"
                        dominantBaseline="middle" fontFamily="inherit" letterSpacing="0.02em">
                        {e.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Nodes — drawn on top */}
            {graph.nodes.map((node) => {
              const isHov = hoveredNode === node.id;
              const { bg, stroke, text, icon } = getTypeColors(node.type);
              const raw = node.label || '';
              const lines = raw.length > 16
                ? [raw.slice(0, 15).trimEnd(), (raw.slice(15, 28) + (raw.length > 28 ? '…' : '')).trimStart()]
                : [raw];
              const pillH = lines.length > 1 ? 30 : 18;

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    cursor: 'pointer',
                    opacity: ready ? 1 : 0,
                    transform: ready ? 'scale(1)' : 'scale(0.65)',
                    transformOrigin: `${node.x}px ${node.y}px`,
                    transition: `all 0.55s cubic-bezier(0.34,1.56,0.64,1) ${0.08 + (node.colIdx || 0) * 0.18}s`,
                  }}
                >
                  {/* Hover pulse ring */}
                  {isHov && (
                    <circle cx={node.x} cy={node.y} r={node.r + 11}
                      fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.28" />
                  )}
                  {/* Shadow + fill circle */}
                  <circle
                    cx={node.x} cy={node.y}
                    r={node.r + (isHov ? 3 : 0)}
                    fill={bg} stroke="#ffffff" strokeWidth="3.5"
                    filter={isHov ? 'url(#nodeHoverShadow)' : 'url(#nodeShadow)'}
                    style={{ transition: 'r 0.22s cubic-bezier(0.18,0.89,0.32,1.28)' }}
                  />
                  {/* Colour border ring */}
                  <circle cx={node.x} cy={node.y}
                    r={node.r + (isHov ? 3 : 0) - 1.5}
                    fill="none" stroke={stroke} strokeWidth={isHov ? 2.5 : 1.8}
                    opacity={isHov ? 1 : 0.6}
                    style={{ transition: 'all 0.22s ease' }}
                    pointerEvents="none" />
                  {/* Inner radial glow */}
                  <circle cx={node.x} cy={node.y} r={node.r}
                    fill="url(#nodeGlow)" pointerEvents="none" />
                  {/* Emoji icon */}
                  <text x={node.x} y={node.y + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="17" style={{ userSelect: 'none', opacity: 0.92 }}>
                    {icon}
                  </text>
                  {/* Always-visible label pill below each node */}
                  <g transform={`translate(${node.x}, ${node.y + node.r + 14})`}>
                    <rect
                      x="-38" y={`${-pillH / 2}`}
                      width="76" height={pillH} rx="9"
                      fill="rgba(255,255,255,0.94)"
                      stroke={isHov ? stroke : 'rgba(217,119,6,0.28)'}
                      strokeWidth={isHov ? 1.8 : 1}
                      style={{ transition: 'stroke 0.2s, stroke-width 0.2s', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.06))' }}
                    />
                    {lines.map((word, wi) => (
                      <text key={wi}
                        textAnchor="middle"
                        fill={text}
                        fontSize="9.5"
                        fontWeight={isHov ? '700' : '600'}
                        fontFamily="inherit"
                        dominantBaseline="middle"
                        y={lines.length > 1 ? (wi === 0 ? -8 : 8) : 0}
                        style={{ userSelect: 'none' }}>
                        {word}
                      </text>
                    ))}
                  </g>
                </g>
              );
            })}
          </svg>
        </Box>

        {/* Legend bar */}
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center', px: 3.5, py: 1.75, borderTop: '1px solid rgba(251,191,36,0.14)', background: 'rgba(255,253,245,0.65)' }}>
          {[
            { icon: '💭', label: 'Belief',   color: '#9a3412' },
            { icon: '🧠', label: 'Thought',  color: '#78350f' },
            { icon: '❤️', label: 'Emotion',  color: '#831843' },
            { icon: '⚡', label: 'Behavior', color: '#1e3a8a' },
          ].map(({ icon, label, color }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.55 }}>
              <Typography sx={{ fontSize: '0.73rem', lineHeight: 1 }}>{icon}</Typography>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color, letterSpacing: '0.04em', opacity: 0.72 }}>{label}</Typography>
            </Box>
          ))}
          {/* Arrow key */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.9 }}>
            <Box sx={{ width: 20, height: 2.5, background: 'linear-gradient(to right, #d97706, #c2610c)', borderRadius: 1, opacity: 0.8 }} />
            <Box sx={{ width: 0, height: 0, borderTop: '4.5px solid transparent', borderBottom: '4.5px solid transparent', borderLeft: '8px solid #b45309', opacity: 0.9 }} />
            <Typography sx={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700, opacity: 0.72, letterSpacing: '0.03em' }}>causal link</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Past step summary in explorer ───────────────────────────────────────────
function PastStep({ step }) {
  const q = isQuestion(step.prompt);
  return (
    <Box sx={{ borderLeft: `2px solid ${q ? 'rgba(251,191,36,0.45)' : 'rgba(34,197,94,0.35)'}`, pl: 2, py: 0.5, mb: 0.75, opacity: 0.42 }}>
      <Typography sx={{ fontSize: '0.76rem', color: '#6b7280', fontStyle: q ? 'italic' : 'normal', lineHeight: 1.5, mb: step.userResponse ? 0.25 : 0 }}>
        {step.prompt.length > 95 ? step.prompt.slice(0, 95) + '…' : step.prompt}
      </Typography>
      {step.userResponse && (
        <Typography sx={{ fontSize: '0.76rem', color: '#374151', lineHeight: 1.5 }}>
          ↳ {step.userResponse.length > 85 ? step.userResponse.slice(0, 85) + '…' : step.userResponse}
        </Typography>
      )}
    </Box>
  );
}

// ─── Thought Explorer Dialog ──────────────────────────────────────────────────
function ReframeDialog({ open, sentence, distortionType, patientId, entryId, onClose }) {
  const [steps, setSteps] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [phase, setPhase] = useState('loading');
  const [userInput, setUserInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [saved, setSaved] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open || !sentence) return;
    setSteps([]); setCurrentPrompt(''); setUserInput(''); setPhase('loading'); setSaved(false);

    fetch(`${API_BASE}/journal/reframe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence, distortion_type: distortionType, history: [] }),
    })
      .then(r => r.json())
      .then(data => {
        const prompt = data.message || 'What feels heaviest about this thought right now?';
        setCurrentPrompt(prompt);
        setPhase(isQuestion(prompt) ? 'question' : 'perspective');
      })
      .catch(() => { setCurrentPrompt('What feels heaviest about this thought right now?'); setPhase('question'); });
  }, [open, sentence, distortionType]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [steps, currentPrompt, phase]);

  // Save exploration on close (if any steps completed)
  const saveAndClose = useCallback(async () => {
    if (!saved && steps.length > 0 && patientId && entryId) {
      setSaved(true);
      try {
        await fetch(`${API_BASE}/journal/entry/${patientId}/${entryId}/save-reframe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence,
            distortion_type: distortionType,
            steps: steps.map(s => ({ prompt: s.prompt, user_response: s.userResponse })),
          }),
        });
      } catch (e) { console.error('Failed to save reframe:', e); }
    }
    onClose();
  }, [saved, steps, patientId, entryId, sentence, distortionType, onClose]);

  const buildHistory = (extraUserMsg) => {
    const hist = [];
    steps.forEach(s => {
      hist.push({ role: 'assistant', content: s.prompt });
      if (s.userResponse) hist.push({ role: 'user', content: s.userResponse });
    });
    hist.push({ role: 'assistant', content: currentPrompt });
    if (extraUserMsg) hist.push({ role: 'user', content: extraUserMsg });
    return hist;
  };

  const fetchNext = async (userResponse) => {
    setThinking(true);
    try {
      const res = await fetch(`${API_BASE}/journal/reframe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence, distortion_type: distortionType, history: buildHistory(userResponse) }),
      });
      const data = await res.json();
      const next = data.message || 'What else comes up?';
      setSteps(prev => [...prev, { prompt: currentPrompt, userResponse }]);
      setCurrentPrompt(next);
      setPhase(isQuestion(next) ? 'question' : 'perspective');
      setUserInput('');
    } catch {
      setSteps(prev => [...prev, { prompt: currentPrompt, userResponse }]);
      setCurrentPrompt('Take a breath. What else comes up for you?');
      setPhase('question'); setUserInput('');
    } finally { setThinking(false); }
  };

  const handleReflect = () => { if (userInput.trim() && !thinking) fetchNext(userInput.trim()); };
  const handleContinue = () => { if (!thinking) fetchNext(undefined); };

  return (
    <Dialog open={open} onClose={saveAndClose} TransitionComponent={SlideUp} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '28px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(253,230,138,0.35)', boxShadow: '0 24px 80px rgba(0,0,0,0.13)', overflow: 'hidden' } }}
      BackdropProps={{ sx: { backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0,0,0,0.12)' } }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '88vh', maxHeight: 660 }}>

        {/* Header */}
        <Box sx={{ px: 3.5, pt: 3, pb: 2.5, borderBottom: '1px solid rgba(253,230,138,0.22)', background: 'rgba(255,253,245,0.98)' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b45309', mb: 1.25, opacity: 0.75 }}>
                🌱 Thought Explorer
              </Typography>
              <Box sx={{ px: 2, py: 1.1, borderRadius: '12px', background: 'linear-gradient(120deg, rgba(253,230,138,0.5) 0%, rgba(251,191,36,0.22) 100%)', border: '1px solid rgba(251,191,36,0.28)' }}>
                <Typography sx={{ fontSize: '0.88rem', color: '#78350f', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.65 }}>
                  "{sentence}"
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={saveAndClose} size="small" sx={{ color: '#9ca3af', ml: 1.5, mt: -0.5, flexShrink: 0 }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Scrollable exploration */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3.5, py: 3, display: 'flex', flexDirection: 'column', '&::-webkit-scrollbar': { width: '3px' }, '&::-webkit-scrollbar-thumb': { background: 'rgba(251,191,36,0.25)', borderRadius: '4px' } }}>

          {/* Past steps timeline */}
          {steps.length > 0 && (
            <Box sx={{ mb: 3 }}>
              {steps.map((s, i) => <PastStep key={i} step={s} />)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2.5 }}>
                <Box sx={{ flex: 1, height: '1px', background: 'rgba(253,230,138,0.45)' }} />
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#d97706', opacity: 0.6 }}>NOW</Typography>
                <Box sx={{ flex: 1, height: '1px', background: 'rgba(253,230,138,0.45)' }} />
              </Box>
            </Box>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, py: 10 }}>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(217,119,6,0.45)', animation: 'dotPulse 1.4s infinite', animationDelay: `${i * 0.22}s`, '@keyframes dotPulse': { '0%,100%': { transform: 'scale(0.7)', opacity: 0.35 }, '50%': { transform: 'scale(1.25)', opacity: 1 } } }} />
                ))}
              </Box>
              <Typography sx={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic', fontWeight: 300 }}>Finding a place to begin…</Typography>
            </Box>
          )}

          {/* Question */}
          {phase === 'question' && (
            <Box sx={{ animation: 'fadeUp 0.4s ease', '@keyframes fadeUp': { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
              <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b45309', opacity: 0.65, mb: 2 }}>
                Agam wonders
              </Typography>
              <Typography sx={{ fontSize: '1.4rem', fontWeight: 200, fontStyle: 'italic', color: '#1c1917', lineHeight: 1.5, letterSpacing: '-0.015em', mb: 3.5 }}>
                {currentPrompt}
              </Typography>
              <Box component="textarea" value={userInput} onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleReflect(); }}
                placeholder="Write whatever comes to mind — there's no wrong answer…"
                disabled={thinking}
                sx={{ width: '100%', minHeight: 110, resize: 'none', border: '1px solid rgba(253,230,138,0.55)', borderRadius: '16px', p: 2.25, fontFamily: 'inherit', fontSize: '0.98rem', lineHeight: 1.75, color: '#374151', background: 'rgba(255,253,245,0.7)', outline: 'none', boxSizing: 'border-box', display: 'block', transition: 'border-color 0.2s, box-shadow 0.2s', '&:focus': { borderColor: 'rgba(251,191,36,0.75)', boxShadow: '0 0 0 3px rgba(251,191,36,0.1)' }, '&::placeholder': { color: 'rgba(156,163,175,0.65)', fontStyle: 'italic' }, '&:disabled': { opacity: 0.5 } }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2.5 }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#d1d5db' }}>⌘ + Enter to continue</Typography>
                <Box onClick={handleReflect} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 3, py: 1.25, borderRadius: '100px', background: userInput.trim() && !thinking ? 'linear-gradient(135deg, #d97706, #b45309)' : 'rgba(217,119,6,0.1)', color: userInput.trim() && !thinking ? '#fff' : 'rgba(180,83,9,0.3)', fontWeight: 500, fontSize: '0.875rem', cursor: userInput.trim() && !thinking ? 'pointer' : 'not-allowed', transition: 'all 0.25s ease', boxShadow: userInput.trim() && !thinking ? '0 4px 14px rgba(180,83,9,0.25)' : 'none', '&:hover': userInput.trim() && !thinking ? { transform: 'translateY(-1px)', boxShadow: '0 6px 18px rgba(180,83,9,0.3)' } : {} }}>
                  {thinking ? <CircularProgress size={14} sx={{ color: '#b45309' }} /> : <EastRoundedIcon sx={{ fontSize: 16 }} />}
                  <span>{thinking ? 'Reflecting…' : 'Reflect & Continue'}</span>
                </Box>
              </Box>
            </Box>
          )}

          {/* Perspective */}
          {phase === 'perspective' && (
            <Box sx={{ animation: 'fadeUp 0.4s ease', '@keyframes fadeUp': { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
              <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#15803d', opacity: 0.7, mb: 2 }}>
                🌿 A different angle
              </Typography>
              <Box sx={{ p: 3.5, borderRadius: '20px', background: 'linear-gradient(135deg, rgba(240,253,244,0.85) 0%, rgba(220,252,231,0.5) 100%)', border: '1px solid rgba(34,197,94,0.2)', mb: 3.5 }}>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 300, color: '#1c1917', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
                  {currentPrompt}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Box onClick={saveAndClose} sx={{ display: 'inline-flex', alignItems: 'center', px: 2.5, py: 1.1, borderRadius: '100px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(255,255,255,0.7)', color: '#166534', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease', '&:hover': { background: 'rgba(255,255,255,1)', borderColor: 'rgba(34,197,94,0.5)' } }}>
                  Sit with this
                </Box>
                <Box onClick={handleContinue} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2.75, py: 1.1, borderRadius: '100px', background: thinking ? 'rgba(21,128,61,0.1)' : 'linear-gradient(135deg, #22c55e, #15803d)', color: thinking ? 'rgba(21,128,61,0.4)' : '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: thinking ? 'not-allowed' : 'pointer', transition: 'all 0.25s ease', boxShadow: thinking ? 'none' : '0 4px 14px rgba(21,128,61,0.25)', '&:hover': thinking ? {} : { transform: 'translateY(-1px)' } }}>
                  {thinking ? <CircularProgress size={13} sx={{ color: '#15803d' }} /> : <EastRoundedIcon sx={{ fontSize: 15 }} />}
                  <span>{thinking ? 'Loading…' : 'Explore further'}</span>
                </Box>
              </Box>
            </Box>
          )}

          <div ref={bottomRef} />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline highlighted text ──────────────────────────────────────────────────
function HighlightedBody({ predictions, onSentenceClick }) {
  if (!predictions || predictions.length === 0) return null;
  return (
    <Box sx={{ lineHeight: 2.0, fontSize: '1.05rem', color: '#166534', fontWeight: 300, fontFamily: 'inherit' }}>
      {predictions.map((item, idx) => {
        if (!isDistorted(item.prediction)) {
          return <React.Fragment key={idx}><span>{item.text}. </span></React.Fragment>;
        }
        const pal = getPalette(item.prediction);
        return (
          <Tooltip
            key={idx}
            title={<Typography sx={{ fontSize: '0.75rem', fontWeight: 400, color: '#fde68a' }}>Click to explore this thought →</Typography>}
            placement="top" arrow
            componentsProps={{ tooltip: { sx: { bgcolor: 'rgba(120,53,15,0.88)', backdropFilter: 'blur(8px)', '& .MuiTooltip-arrow': { color: 'rgba(120,53,15,0.88)' }, borderRadius: '10px', px: 1.5, py: 0.75 } } }}
          >
            <Box component="span" sx={{ display: 'inline', position: 'relative' }}>
              <Box component="span" onClick={() => onSentenceClick(item.text, item.prediction)}
                sx={{ background: `linear-gradient(120deg, ${pal.fill}44 0%, ${pal.fill}22 100%)`, borderRadius: '6px', px: '5px', py: '2px', cursor: 'pointer', transition: 'background 0.25s ease', '&:hover': { background: `linear-gradient(120deg, ${pal.fill}77 0%, ${pal.fill}44 100%)` } }}>
                {item.text}.
              </Box>
              <Box component="span" sx={{ display: 'inline-block', ml: '5px', mr: '2px', px: '8px', py: '1px', background: `${pal.fill}33`, border: `1px solid ${pal.stroke}66`, borderRadius: '100px', fontSize: '0.67rem', fontWeight: 500, letterSpacing: '0.015em', color: pal.text, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                {item.prediction}
              </Box>{' '}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// ─── Past Entry Card ──────────────────────────────────────────────────────────
function PastEntryCard({ entry, onSentenceClick }) {
  const [open, setOpen] = useState(false);
  const distortionCount = (entry.predictions || []).filter(p => isDistorted(p.prediction)).length;
  const reframings = entry.reframings || [];

  return (
    <Box sx={{ mb: 2, borderRadius: '20px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(34,197,94,0.18)', backdropFilter: 'blur(12px)', overflow: 'hidden', transition: 'box-shadow 0.25s ease', '&:hover': { boxShadow: '0 8px 32px rgba(21,128,61,0.1)' } }}>
      <Box onClick={() => setOpen(o => !o)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, cursor: 'pointer' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
            {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </Typography>
          <Typography sx={{ fontSize: '0.93rem', color: '#064e3b', fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.text}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 2, flexShrink: 0 }}>
          {distortionCount > 0 && (
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: '100px', background: 'rgba(253,230,138,0.35)', border: '1px solid rgba(251,191,36,0.4)', fontSize: '0.72rem', fontWeight: 500, color: '#92400e' }}>
              {distortionCount} pattern{distortionCount > 1 ? 's' : ''}
            </Box>
          )}
          {reframings.length > 0 && (
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: '100px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: '0.72rem', fontWeight: 500, color: '#15803d' }}>
              {reframings.length} explored
            </Box>
          )}
          <IconButton size="small" sx={{ color: '#9ca3af' }}>
            {open ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
      <Collapse in={open}>
        <Divider sx={{ borderColor: 'rgba(34,197,94,0.1)' }} />
        <Box sx={{ px: 3, py: 2.5 }}>
          <HighlightedBody predictions={entry.predictions} onSentenceClick={onSentenceClick} />
          {/* Show thought graph for past entries too */}
          {entry.predictions && entry.predictions.length > 1 && (
            <ThoughtGraph text={entry.text} predictions={entry.predictions} />
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientJournal() {
  const { patientId } = useParams();
  const id = Number(patientId || 1);
  const navigate = useNavigate();

  const [mode, setMode] = useState('write');
  const [text, setText] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [pastEntries, setPastEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);

  const [reframeOpen, setReframeOpen] = useState(false);
  const [reframeSentence, setReframeSentence] = useState('');
  const [reframeDistortion, setReframeDistortion] = useState('');

  const fetchEntries = useCallback(() => {
    setEntriesLoading(true);
    fetch(`${API_BASE}/journal/${id}`)
      .then(r => r.json())
      .then(data => setPastEntries(Array.isArray(data) ? [...data].sort((a, b) => b.entry_id - a.entry_id) : []))
      .catch(() => setPastEntries([]))
      .finally(() => setEntriesLoading(false));
  }, [id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleAnalyze = async () => {
    if (!text.trim() || mode !== 'write') return;
    setMode('loading');
    try {
      const res = await fetch(`${API_BASE}/journal/entry/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setCurrentEntry(data);
      setMode('result');
      fetchEntries();
    } catch (e) {
      console.error(e);
      setMode('write');
    }
  };

  const handleNewEntry = () => { setText(''); setCharCount(0); setCurrentEntry(null); setMode('write'); };
  const handleSentenceClick = (sentence, distortion) => { setReframeSentence(sentence); setReframeDistortion(distortion); setReframeOpen(true); };

  const handleReframeClose = useCallback(() => {
    setReframeOpen(false);
    // Re-fetch after a short delay to get updated reframings
    setTimeout(fetchEntries, 400);
  }, [fetchEntries]);

  const distortionCount = currentEntry ? currentEntry.predictions.filter(p => isDistorted(p.prediction)).length : 0;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: { xs: 8, md: 10 }, pb: { xs: 8, md: 12 }, minHeight: '100vh' }}>
      <Container maxWidth="md">

        <ReframeDialog
          open={reframeOpen}
          sentence={reframeSentence}
          distortionType={reframeDistortion}
          patientId={id}
          entryId={currentEntry?.entry_id}
          onClose={handleReframeClose}
        />

        {/* Back */}
        <Grow in timeout={400}>
          <Box onClick={() => navigate(`/client/${id}`)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mb: 5, cursor: 'pointer', color: '#4b7a5e', opacity: 0.7, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
            <ArrowBackIcon sx={{ fontSize: 17 }} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>Back to Dashboard</Typography>
          </Box>
        </Grow>

        {/* Header */}
        <Grow in timeout={600}>
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #86efac, #22c55e)', boxShadow: '0 4px 14px rgba(34,197,94,0.25)' }}>
                <AutoAwesomeIcon sx={{ fontSize: 22, color: '#fff' }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 200, color: '#064e3b', letterSpacing: '-0.02em' }}>Smart Journal</Typography>
            </Box>
            <Typography sx={{ color: '#166634', fontWeight: 300, fontSize: '1rem', opacity: 0.82, maxWidth: 520 }}>
              Write freely. Tap any highlighted phrase to explore that thought with Agam.
            </Typography>
          </Box>
        </Grow>

        {/* ── Write / Result card ── */}
        <Grow in timeout={800}>
          <Box sx={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.72)', border: mode === 'result' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(34,197,94,0.2)', borderRadius: '28px', p: { xs: 3, md: 4.5 }, boxShadow: mode === 'result' ? '0 8px 40px rgba(251,191,36,0.08)' : '0 8px 32px rgba(21,128,61,0.07)', mb: 5, transition: 'border-color 0.4s ease, box-shadow 0.4s ease' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: mode === 'result' ? '#92400e' : '#4b7a5e', transition: 'color 0.3s ease' }}>
                {mode === 'result' ? "✨ Agam's Reading" : 'New Entry'}
              </Typography>
              {mode === 'result' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {distortionCount === 0 && <Box sx={{ px: 1.5, py: 0.3, borderRadius: '100px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: '0.72rem', fontWeight: 500, color: '#15803d' }}>🌿 All clear</Box>}
                  <Box onClick={handleNewEntry} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.75, py: 0.6, borderRadius: '100px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', fontWeight: 500, color: '#166534', cursor: 'pointer', transition: 'all 0.2s ease', '&:hover': { background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(34,197,94,0.5)', transform: 'translateY(-1px)' } }}>
                    <AddRoundedIcon sx={{ fontSize: 14 }} /> New entry
                  </Box>
                </Box>
              )}
            </Box>

            {/* Write */}
            {mode === 'write' && (
              <>
                <Box component="textarea" value={text} onChange={e => { setText(e.target.value); setCharCount(e.target.value.length); }}
                  placeholder="What's on your mind today? Write as much or as little as you'd like..."
                  sx={{ width: '100%', minHeight: 200, resize: 'vertical', border: '1px solid rgba(34,197,94,0.18)', borderRadius: '16px', p: 2.5, fontFamily: 'inherit', fontSize: '1.02rem', lineHeight: 1.8, color: '#064e3b', background: 'rgba(240,253,244,0.5)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box', display: 'block', '&:focus': { borderColor: 'rgba(34,197,94,0.45)', boxShadow: '0 0 0 3px rgba(34,197,94,0.07)' }, '&::placeholder': { color: 'rgba(22,101,52,0.38)', fontWeight: 300 } }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5 }}>
                  <Typography sx={{ fontSize: '0.76rem', color: '#9ca3af' }}>{charCount > 0 ? `${charCount} characters` : 'Each sentence is analyzed separately'}</Typography>
                  <Box onClick={handleAnalyze} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 3, py: 1.25, borderRadius: '100px', background: !text.trim() ? 'rgba(34,197,94,0.12)' : 'linear-gradient(135deg, #22c55e, #15803d)', color: !text.trim() ? 'rgba(21,128,61,0.4)' : '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: !text.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.25s ease', boxShadow: !text.trim() ? 'none' : '0 4px 14px rgba(21,128,61,0.28)', '&:hover': !text.trim() ? {} : { transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(21,128,61,0.38)' }, '&:active': { transform: 'scale(0.97)' } }}>
                    <AutoAwesomeIcon sx={{ fontSize: 15 }} />
                    <span>Analyze &amp; Save</span>
                  </Box>
                </Box>
              </>
            )}

            {/* Loading */}
            {mode === 'loading' && (
              <Box sx={{ minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, py: 4 }}>
                <CircularProgress size={36} thickness={2.5} sx={{ color: '#22c55e', opacity: 0.75 }} />
                <Typography sx={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 300, fontStyle: 'italic' }}>Agam is reading your entry…</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 300 }}>This may take a moment</Typography>
              </Box>
            )}

            {/* Result */}
            {mode === 'result' && currentEntry && (
              <>
                <Box sx={{ minHeight: 120, border: '1px solid rgba(251,191,36,0.2)', borderRadius: '16px', p: 2.5, background: 'rgba(255,253,245,0.7)' }}>
                  <HighlightedBody predictions={currentEntry.predictions} onSentenceClick={handleSentenceClick} />
                </Box>
                {distortionCount > 0 && (
                  <Typography sx={{ mt: 2, fontSize: '0.8rem', color: '#9ca3af', fontWeight: 300, fontStyle: 'italic' }}>
                    Tap a highlighted phrase to explore that thought with Agam.
                  </Typography>
                )}
                {/* Thought Graph */}
                <ThoughtGraph text={currentEntry.text} predictions={currentEntry.predictions} />
              </>
            )}
          </Box>
        </Grow>

        {/* ── Past entries ── */}
        <Grow in timeout={1000}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <BookIcon sx={{ fontSize: 17, color: '#4b7a5e', opacity: 0.65 }} />
              <Typography sx={{ fontWeight: 500, color: '#064e3b', fontSize: '0.95rem' }}>Past Entries</Typography>
            </Box>
            {entriesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={26} sx={{ color: '#22c55e', opacity: 0.6 }} />
              </Box>
            ) : pastEntries.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography sx={{ fontSize: '2rem', mb: 1 }}>📖</Typography>
                <Typography sx={{ fontWeight: 300, color: '#9ca3af', fontSize: '0.9rem' }}>Your journal is empty. Write your first entry above.</Typography>
              </Box>
            ) : pastEntries.map(entry => (
              <PastEntryCard key={entry.entry_id} entry={entry} onSentenceClick={handleSentenceClick} />
            ))}
          </Box>
        </Grow>

      </Container>
    </Box>
  );
}
