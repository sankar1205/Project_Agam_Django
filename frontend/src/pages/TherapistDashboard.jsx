import React, { useEffect, useState, useRef } from 'react'
import { API_BASE } from '../config'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'

// Mock Data for the Pitch Demo & Drill-downs
const mockTrendData = [
  { date: 'Mon', stability: 65, mood: 5, anxiety: 6 },
  { date: 'Tue', stability: 40, mood: 3, anxiety: 8 },
  { date: 'Wed', stability: 55, mood: 4, anxiety: 7 },
  { date: 'Thu', stability: 80, mood: 7, anxiety: 4 },
  { date: 'Fri', stability: 85, mood: 8, anxiety: 3 },
  { date: 'Sat', stability: 75, mood: 7, anxiety: 4 },
  { date: 'Sun', stability: 90, mood: 9, anxiety: 2 },
];

const mockFlaggedEntries = [
  { date: 'Tue, 10:30 PM', text: "I just can't see how this is going to get any better. I'm so behind on my coursework.", flag: 'Hopelessness' },
  { date: 'Wed, 02:15 AM', text: "Woke up panicking again. If I fail this midterm, my whole degree is pointless.", flag: 'Catastrophizing' }
];

export default function TherapistDashboard(){
  const [patientId, setPatientId] = useState(null)
  const [patients, setPatients] = useState([])
  const [state, setState] = useState(null)
  const [loadingState, setLoadingState] = useState(false)
  const [journalEntries, setJournalEntries] = useState([])
  const [journalLoading, setJournalLoading] = useState(false)

  // Dashboard Interactive State
  const [activeDrillDown, setActiveDrillDown] = useState(null)

  // Therapist Operations State
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [tone, setTone] = useState('Supportive')
  const [toast, setToast] = useState(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [lastNotePreview, setLastNotePreview] = useState(null)
  const [notes, setNotes] = useState([])
  const [noteDraft, setNoteDraft] = useState('')
  const [showSessionModal, setShowSessionModal] = useState(false)

  // Intervention Console State
  const [customMessage, setCustomMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const customPromptRef = useRef(null)

  // Module Editing State
  const [editingModule, setEditingModule] = useState(null)
  const [modName, setModName] = useState('')
  const [modGoal, setModGoal] = useState('')
  const [modStatus, setModStatus] = useState('pending')
  const dropRef = useRef(null)

  useEffect(()=>{
    fetchPatients()
  }, [])

  useEffect(()=>{
    if(patientId) {
      loadPatient()
      loadJournal()
      setActiveDrillDown(null)
      setShowCustomPrompt(false)
    }
  }, [patientId])

  async function fetchPatients() {
    try {
      const res = await fetch(`${API_BASE}/patients`)
      if(res.ok) {
        const data = await res.json()
        setPatients(data)
        if(data.length > 0) setPatientId(data[0].id)
      }
    } catch(err) {
      console.warn('Failed to fetch patients', err)
    }
  }

  async function loadJournal(){
    setJournalLoading(true)
    try{
      const res = await fetch(`${API_BASE}/journal/${patientId}`)
      if(!res.ok) throw new Error('Failed to load journal')
      const data = await res.json()
      setJournalEntries(Array.isArray(data) ? data : [])
    }catch(err){
      console.warn(err)
      setJournalEntries([])
    }finally{
      setJournalLoading(false)
    }
  }

  // --- Insight Computations ---
  const computedInsights = React.useMemo(() => {
    const tally = {}
    let distortedSentences = 0
    let totalSentences = 0

    journalEntries.forEach(entry => {
      (entry.predictions || []).forEach(p => {
        totalSentences++
        const dist = (p.prediction || '').trim()
        if(dist && !['no distortion', 'none', 'neutral', ''].includes(dist.toLowerCase())) {
          distortedSentences++
          tally[dist] = (tally[dist] || 0) + 1
        }
      })
    })

    const topDistortions = Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0, 4)
    return { topDistortions, totalSentences, distortedSentences }
  }, [journalEntries])

  async function loadPatient(){
    setLoadingState(true)
    try{
      const res = await fetch(`${API_BASE}/patient/state/${patientId}`)
      if(!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setState(json)
      setTone(json.therapist_tone || 'Supportive')
      setSessionActive(Boolean(json.session_active))
      setLastNotePreview(json.last_session_note_preview || null)
      loadNotes()
    }catch(err){
      console.error(err)
      setToast({type:'error', text:'Unable to load patient state'})
    }finally{ setLoadingState(false) }
  }

  // --- Intervention Functions ---
  async function sendIntervention(text, actionType = 'message') {
    if(!text.trim()) return;
    setIsSending(true);

    if (tone) {
      try {
        await fetch(`${API_BASE}/therapist/update/${patientId}`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ therapist_tone: tone })
        });
      } catch (e) {
        console.warn("Could not sync tone update before sending intervention", e);
      }
    }

    try {
      const payload = { message: `[Therapist ${actionType}]: ${text}` };
      const res = await fetch(`${API_BASE}/therapist/message/${patientId}`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error("Failed to send intervention");

      setToast({type: 'success', text: 'Intervention sent to patient context'});
      setCustomMessage('');
      setShowCustomPrompt(false);
      await loadPatient();
    } catch(err) {
      console.error(err);
      setToast({type: 'error', text: 'Failed to send intervention'});
    } finally {
      setIsSending(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  function handleEditPrompt(text) {
    setCustomMessage(text);
    setShowCustomPrompt(true);
    // Slight delay to allow textarea to render before focusing
    setTimeout(() => {
      if(customPromptRef.current) customPromptRef.current.focus();
    }, 50);
  }

  // Intervention Categories Configuration
  const interventionCategories = [
    {
      id: 'suggested',
      icon: '🧠',
      title: 'Suggested Actions',
      actionType: 'Suggested Action',
      itemClass: 'bg-green-50/40 border-green-200',
      editBtnClass: 'border-green-200 text-green-700 hover:bg-green-100/50',
      sendBtnClass: 'bg-green-600 text-white hover:bg-green-700',
      suggestions: [
        { label: "Cognitive Restructuring", prompt: "Guide the patient through a cognitive restructuring exercise for their recent anxious thoughts." },
        { label: "Identify All-or-Nothing", prompt: "Help the patient identify 'all-or-nothing' thinking in their recent journal entries." },
        { label: "Examine the Evidence", prompt: "Prompt the patient to look for concrete evidence against their current negative belief." }
      ]
    },
    {
      id: 'somatic',
      icon: '🫁',
      title: 'Breathing & Somatic',
      actionType: 'Somatic Exercise',
      itemClass: 'bg-blue-50/40 border-blue-200',
      editBtnClass: 'border-blue-300 text-blue-800 hover:bg-blue-100/80',
      sendBtnClass: 'bg-blue-600 text-white hover:bg-blue-700',
      suggestions: [
        { label: "4-7-8 Breathing", prompt: "Initiate a 4-7-8 breathing exercise to help lower the patient's physiological arousal." },
        { label: "Muscle Relaxation", prompt: "Guide the patient through a brief progressive muscle relaxation (PMR) sequence." },
        { label: "5-4-3-2-1 Grounding", prompt: "Ask the patient to do a 5-4-3-2-1 grounding exercise to bring them back to the present." },
        { label: "Box Breathing", prompt: "Guide the patient through a 4-second box breathing cycle to regain focus." }
      ]
    },
    {
      id: 'risk',
      icon: '📋',
      title: 'Risk Check-in',
      actionType: 'Check-in',
      itemClass: 'bg-amber-50/40 border-amber-200',
      editBtnClass: 'border-amber-300 text-amber-800 hover:bg-amber-100/80',
      sendBtnClass: 'bg-amber-600 text-white hover:bg-amber-700',
      suggestions: [
        { label: "Sleep", prompt: "Perform a check-in specifically focused on the patient's sleep quality, duration, and patterns." },
        { label: "General", prompt: "Perform a standardized general mood and risk check-in." },
        { label: "Relationships", prompt: "Perform a check-in exploring the patient's current relationships and social support network." },
        { label: "Career", prompt: "Perform a check-in focusing on the patient's career, academic stress, and work-life balance." }
      ]
    }
  ];

  // --- Session, Note, PDF Upload, and Module Editing Functions ---
  function openSessionModal(){ setTone(state?.therapist_tone || 'Supportive'); setNoteDraft(''); setShowSessionModal(true) }
  function closeSessionModal(){ setShowSessionModal(false) }
  async function loadNotes(){ try{ const res = await fetch(`${API_BASE}/therapist/session/notes/${patientId}`); if(!res.ok) return; const j = await res.json(); setNotes(j.session_notes || []); setSessionActive(Boolean(j.session_active)) }catch(e){ console.warn('Failed to load notes', e) } }
  async function startSession(reason){ try{ const body = reason ? { reason } : {}; const res = await fetch(`${API_BASE}/therapist/session/start/${patientId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); if(!res.ok) throw new Error(await res.text()); await res.json(); setToast({type:'success', text:'Session started'}); setSessionActive(true); await loadNotes(); setTimeout(() => setToast(null), 3000); }catch(e){ console.error(e); setToast({type:'error', text:'Failed to start session'}) } }
  async function endSession(reason){ try{ const body = reason ? { reason } : {}; const res = await fetch(`${API_BASE}/therapist/session/end/${patientId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); if(!res.ok) throw new Error(await res.text()); setToast({type:'success', text:'Session ended'}); setSessionActive(false); await loadNotes(); setTimeout(() => setToast(null), 3000); }catch(e){ console.error(e); setToast({type:'error', text:'Failed to end session'}) } }
  async function saveNote(){ if(!noteDraft.trim()){ setToast({type:'error', text:'Note cannot be empty'}); return }; try{ const payload = { author: 'therapist', note: noteDraft.trim() }; const res = await fetch(`${API_BASE}/therapist/session/note/${patientId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if(!res.ok) throw new Error(await res.text()); await res.json(); setToast({type:'success', text:'Note saved'}); setNoteDraft(''); await loadNotes(); setTimeout(() => setToast(null), 3000); }catch(e){ console.error(e); setToast({type:'error', text:'Failed to save note'}) } }

  function patientList(){ return patients }

  function onDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; dropRef.current?.classList.add('ring-2','ring-green-300') }
  function onDragLeave(e){ e.preventDefault(); dropRef.current?.classList.remove('ring-2','ring-green-300') }
  async function onDrop(e){ e.preventDefault(); dropRef.current?.classList.remove('ring-2','ring-green-300'); const f = e.dataTransfer.files?.[0]; if(!f) return; if(f.type !== 'application/pdf') { setToast({type:'error', text:'Please upload a PDF file'}); return }; await uploadPdf(f) }
  async function onFileChange(e){ const f = e.target.files?.[0]; if(!f) return; if(f.type !== 'application/pdf'){ setToast({type:'error', text:'Please select a PDF'}); return }; await uploadPdf(f) }

  async function uploadPdf(file){ setUploading(true); setUploadMessage('Architect Agent is structuring curriculum...'); try{ const fd = new FormData(); fd.append('file', file); const res = await fetch(`${API_BASE}/therapist/upload-pdf/${patientId}`, { method: 'POST', body: fd }); if(res.status === 404 || res.status === 405){ console.warn('Upload endpoint missing, falling back'); await fallbackExtractAndAppend(file); return }; if(!res.ok){ const t = await res.text(); throw new Error(t || 'Upload failed') }; const j = await res.json(); setToast({type:'success', text: j.status || 'Processing'}); setUploadMessage('Processing in background'); setTimeout(()=>loadPatient(), 1600) }catch(err){ console.error(err); if(err.message && err.message.toLowerCase().includes('not found')){ await fallbackExtractAndAppend(file) }else{ setToast({type:'error', text: 'PDF upload failed'}); setUploadMessage('') } }finally{ setUploading(false) } }

  async function fallbackExtractAndAppend(file){ setUploadMessage('Extracting PDF client-side...'); try{ const arrayBuffer = await file.arrayBuffer(); const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf'); pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.9.179/legacy/build/pdf.worker.min.js`; const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise; let fullText = ''; for(let i=1;i<=pdf.numPages;i++){ const page = await pdf.getPage(i); const content = await page.getTextContent(); const pageText = content.items.map(it => it.str).join(' '); fullText += `\n\n--- Page ${i} ---\n${pageText}`; if(fullText.length > 120000){ fullText = fullText.slice(0,120000) + '\n\n[Truncated]'; break } }; const payload = { message: `PDF Upload (${file.name}):\n\n${fullText.trim()}` }; const r2 = await fetch(`${API_BASE}/therapist/message/${patientId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if(!r2.ok){ const t = await r2.text(); throw new Error(t || 'Append failed') }; await r2.json(); setToast({type:'success', text: 'PDF content appended'}); setUploadMessage('PDF appended to history'); setTimeout(()=>loadPatient(), 1200) }catch(err){ console.error(err); setToast({type:'error', text:'Failed to extract PDF'}); setUploadMessage('') } }

  function openEditModule(mod) { setEditingModule(mod); setModName(mod.name || ''); setModGoal(mod.clinical_goal || ''); setModStatus(mod.status || 'pending') }
  function closeEditModule() { setEditingModule(null) }

  async function saveModule() { if(!editingModule) return; try { const payload = { name: modName, clinical_goal: modGoal, status: modStatus }; const res = await fetch(`${API_BASE}/therapist/module/${patientId}/${editingModule.module_id}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }); if(!res.ok) throw new Error("Failed to save module"); setToast({type:'success', text: 'Module updated successfully'}); await loadPatient(); closeEditModule(); setTimeout(() => setToast(null), 3000); } catch(err) { console.error(err); setToast({type:'error', text: 'Failed to update module'}) } }

  function renderPlan(){
    const plan = state?.treatment_plan || []
    if(plan.length === 0) return <p className="text-sm text-green-900/70">No treatment plan available.</p>
    return (
      <ol className="space-y-3">
        {plan.map((m)=>{
          const status = m.status || 'locked'
          const common = 'p-4 rounded-xl border flex items-start justify-between gap-3 group cursor-pointer transition-all hover:shadow hover:-translate-y-0.5'
          let icon = '🔒'; let ring = 'border-gray-200 bg-white/60 opacity-60 hover:opacity-100'; let iconBg = 'bg-gray-200 text-gray-500'; let activeBadge = null
          if (status === 'completed') { icon = '✓'; ring = 'border-green-300 bg-green-50 hover:bg-green-100'; iconBg = 'bg-green-600 text-white font-bold' }
          else if (status === 'pending') { icon = '⟳'; ring = 'border-green-400 bg-green-50/90 ring-1 ring-green-200 hover:bg-green-100'; iconBg = 'bg-green-500 text-white font-bold'; activeBadge = <span className="text-xs text-green-700/80 ml-2">(Active)</span> }
          return (
            <li key={m.module_id} className={`${common} ${ring}`} onClick={() => openEditModule(m)}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1"><div className={`h-9 w-9 rounded-full flex items-center justify-center text-[15px] shadow-sm ${iconBg}`}>{icon}</div></div>
                <div>
                  <div className="font-bold text-green-900/90 text-[15px]">{m.name} {activeBadge}</div>
                  <div className={`text-sm mt-0.5 leading-snug ${status === 'locked' ? 'text-green-900/50' : 'text-green-900/70'}`}>
                    {status === 'locked' ? 'Locked until prerequisites complete' : m.clinical_goal}
                  </div>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 mt-1 flex-shrink-0 text-green-800 font-semibold text-xs px-2.5 py-1.5 bg-white border border-green-200 rounded-lg shadow-sm transition-opacity">Edit</div>
            </li>
          )
        })}
      </ol>
    )
  }

  const cardCls = 'bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-green-100 shadow-sm'

  return (
    // Expanded max-width pushes content to the edges, increasing dashboard space
    <div className="w-full max-w-[1500px] mx-auto p-4 md:p-6">

      {/* 12-column grid layout for finer control. Sidebar gets 2/12 (~16%), Main gets 10/12 (~83%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Sidebar (Narrower and aligned left) */}
        <aside className={`col-span-1 lg:col-span-2 ${cardCls} h-fit sticky top-24`}>
          <h2 className="text-lg font-semibold text-green-900">Patients</h2>
          <p className="text-xs text-green-900/60 mt-1">Select a patient to manage their curriculum</p>
          <div className="mt-4 space-y-2">
            {patientList().map(p => (
              <button
                key={p.id}
                onClick={()=>setPatientId(p.id)}
                className={`w-full text-left p-2.5 rounded-xl text-green-900 transition-all text-sm ${patientId===p.id ? 'bg-green-100 border-l-4 border-green-500 font-semibold' : 'hover:bg-green-50'} focus:outline-none focus:ring-2 focus:ring-green-200`}
                aria-pressed={patientId===p.id}
              >{p.label}</button>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-green-900 uppercase tracking-wide">Quick actions</h3>
            <div className="mt-2 flex flex-col gap-2">
              <button onClick={loadPatient} className="px-3 py-2 bg-green-50 text-green-900 border border-green-200 rounded-xl hover:bg-green-100 transition-colors text-xs font-medium">Reload patient</button>
            </div>
          </div>
        </aside>

        {/* Main area (Expanded wider) */}
        <main className="col-span-1 lg:col-span-10 space-y-6">

          {/* Header & New Analytics Cards */}
          <div className={cardCls}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-green-900">Therapist Dashboard</h1>
                <p className="text-sm text-green-900/60 mt-1">Patient: <span className="font-semibold text-green-800">{state?.name || ('Patient ' + patientId)}</span></p>
              </div>
              <div className={`text-sm px-3 py-1.5 rounded-full border ${loadingState ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                {loadingState ? 'Loading…' : 'Status: Ready'}
              </div>
            </div>

            {/* INTERACTIVE 4-CARD GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              {/* Card 1: Summary */}
              <button
                onClick={() => setActiveDrillDown(activeDrillDown === 'summary' ? null : 'summary')}
                className={`text-left p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-1 ${activeDrillDown === 'summary' ? 'bg-green-100 border-green-400 ring-2 ring-green-200' : 'bg-white/60 border-green-200/50'}`}
              >
                <div className="text-xs font-bold text-green-900/60 uppercase tracking-wider mb-2">Summary</div>
                <div className="text-sm font-semibold text-green-900 flex items-center gap-2">
                  <span>Mood <span className="text-red-500 font-bold">↓</span></span>
                  <span className="text-gray-300">|</span>
                  <span>Anx <span className="text-red-500 font-bold">↑</span></span>
                </div>
                <div className="mt-2 text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded inline-block border border-amber-200">
                  Risk: Moderate
                </div>
              </button>

              {/* Card 2: Key Insights */}
              <button
                onClick={() => setActiveDrillDown(activeDrillDown === 'insights' ? null : 'insights')}
                className={`text-left p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-1 ${activeDrillDown === 'insights' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : 'bg-white/60 border-indigo-100/50'}`}
              >
                <div className="text-xs font-bold text-indigo-900/60 uppercase tracking-wider mb-2">Key Insights</div>
                <ul className="text-xs text-indigo-900 space-y-1 font-medium leading-tight">
                  <li>• Catastrophizing <span className="text-red-500 font-bold">↑</span> 40%</li>
                  <li>• Negative thoughts at night</li>
                  <li>• Academic stress trigger</li>
                </ul>
              </button>

              {/* Card 3: Risk Alerts */}
              <button
                onClick={() => setActiveDrillDown(activeDrillDown === 'risk_alert' ? null : 'risk_alert')}
                className={`text-left p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-1 ${activeDrillDown === 'risk_alert' ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white/60 border-red-100/50'}`}
              >
                <div className="text-xs font-bold text-red-900/60 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Risk Alerts <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                </div>
                <div className="text-sm font-semibold text-red-900 leading-snug">
                  Mild hopelessness language detected
                </div>
                <div className="mt-2 text-[10px] text-red-700/70">Click to review flags</div>
              </button>

              {/* Card 4: Engagement */}
              <button
                onClick={() => setActiveDrillDown(activeDrillDown === 'engagement' ? null : 'engagement')}
                className={`text-left p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-1 ${activeDrillDown === 'engagement' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' : 'bg-white/60 border-emerald-100/50'}`}
              >
                <div className="text-xs font-bold text-emerald-900/60 uppercase tracking-wider mb-2">Engagement</div>
                <ul className="text-xs text-emerald-900 space-y-1 font-medium leading-tight">
                  <li>• 5 entries this week</li>
                  <li className="text-amber-700">• Skipped last 2 days</li>
                </ul>
                <div className="mt-2 text-[10px] text-emerald-700/70">View calendar trend</div>
              </button>
            </div>

            {/* DRILL-DOWN PANEL */}
            {activeDrillDown && (
              <div className="mt-4 p-5 bg-white border border-gray-200 rounded-xl shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-md font-bold text-gray-800 capitalize">
                    {activeDrillDown === 'risk_alert' ? 'Risk Alerts' : activeDrillDown} Details
                  </h3>
                  <button onClick={() => setActiveDrillDown(null)} className="text-gray-400 hover:text-gray-700">✕</button>
                </div>

                {activeDrillDown === 'summary' && (
                  <div className="w-full h-[250px]">
                    <p className="text-xs text-gray-500 mb-2">Patient Stability vs. Mood & Anxiety Tracker</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef5f1" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5b6876' }} dy={10} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5b6876' }} domain={[0, 100]} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5b6876' }} domain={[0, 10]} />
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line yAxisId="left" type="monotone" name="Stability (%)" dataKey="stability" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" name="Mood (1-10)" dataKey="mood" stroke="#3b82f6" strokeWidth={3} dot={false} />
                        <Line yAxisId="right" type="monotone" name="Anxiety (1-10)" dataKey="anxiety" stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeDrillDown === 'insights' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-indigo-900 mb-3">Live Distortion Tracking</h4>
                      {journalLoading ? (
                        <div className="text-sm text-gray-400 animate-pulse">Analyzing journals...</div>
                      ) : computedInsights.topDistortions.length > 0 ? (
                        <div className="space-y-3">
                          {computedInsights.topDistortions.map(([name, count]) => (
                            <div key={name}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-indigo-900">{name}</span>
                                <span className="text-indigo-900/60">{count} occurrences</span>
                              </div>
                              <div className="w-full bg-indigo-50 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-indigo-400 h-1.5 rounded-full" style={{width: `${Math.min((count/computedInsights.distortedSentences)*100, 100)}%`}}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">No exact NLP patterns detected yet.</div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-indigo-900 mb-3">Contextual Triggers</h4>
                      <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm text-indigo-900">
                        <p className="mb-2"><strong>Time of day:</strong> 70% of negative entries occur between 11:00 PM and 2:00 AM.</p>
                        <p><strong>Topics:</strong> Highly correlated with keywords "exams", "deadlines", and "failing".</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeDrillDown === 'risk_alert' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">The following recent journal entries triggered automated risk flags requiring therapist review:</p>
                    <div className="space-y-3">
                      {mockFlaggedEntries.map((entry, idx) => (
                        <div key={idx} className="p-3 border-l-4 border-red-400 bg-red-50 rounded-r-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-red-800 uppercase">{entry.flag}</span>
                            <span className="text-xs text-red-800/60">{entry.date}</span>
                          </div>
                          <p className="text-sm text-red-950 font-medium italic">"{entry.text}"</p>
                        </div>
                      ))}
                    </div>
                    <button className="mt-4 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded hover:bg-red-50">Mark as Reviewed</button>
                  </div>
                )}

                {activeDrillDown === 'engagement' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">Patient has logged <strong>5 sessions</strong> out of the recommended 7 this week. Noticeable drop-off over the weekend.</p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                        const isMissed = day === 'Sat' || day === 'Sun';
                        return (
                          <div key={day} className={`flex-1 min-w-[60px] p-2 rounded-lg border text-center ${isMissed ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-emerald-50 border-emerald-200'}`}>
                            <div className="text-xs font-bold text-gray-500">{day}</div>
                            <div className="mt-1 text-lg">{isMissed ? '—' : '📝'}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Intervention Console (Fully Restructured) */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-green-900">Intervention Console</h2>
                <p className="text-sm text-green-900/60 mt-1">Directly inject prompts, exercises, or adjust the AI's approach.</p>
              </div>

              {/* Tone Toggle */}
              <div className="bg-gray-100/80 p-1 rounded-xl flex items-center shadow-inner border border-gray-200/50">
                {['Supportive', 'Neutral', 'Challenging'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tone === t ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 3-Column Grid for Quick Interventions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {interventionCategories.map((cat) => {
                // Determine layout rules and color themes dynamically per column
                const isGrid = cat.id === 'risk' || cat.id === 'somatic';
                const getColors = (id) => {
                  if(id === 'risk') return { bg: 'bg-amber-50/50', text: 'text-amber-900', textDark: 'text-amber-950', border: 'border-amber-200' };
                  if(id === 'somatic') return { bg: 'bg-blue-50/50', text: 'text-blue-900', textDark: 'text-blue-950', border: 'border-blue-200' };
                  return { bg: 'bg-green-50/50', text: 'text-green-900', textDark: 'text-green-950', border: 'border-green-200' };
                }
                const { bg, text, textDark, border } = getColors(cat.id);

                return (
                  <div key={cat.id} className={`p-4 rounded-xl border ${border} bg-white/50 shadow-sm flex flex-col`}>
                    <h3 className={`text-sm font-bold ${text} uppercase tracking-wider mb-4 flex items-center gap-2`}>
                      <span>{cat.icon}</span> {cat.title}
                    </h3>

                    <div className={isGrid ? 'grid grid-cols-2 gap-2 flex-grow' : 'flex flex-col gap-2 flex-grow'}>
                      {cat.suggestions.map((sugg, idx) => (
                        <div key={idx} className={`relative group rounded-xl border ${cat.itemClass} flex flex-col items-center justify-center min-h-[90px] overflow-hidden transition-all shadow-sm hover:shadow-md`}>

                          {/* Default State: Just the Label */}
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 group-hover:-translate-y-full group-hover:opacity-0 ${bg}`}>
                            <span className={`text-xs font-bold ${text} uppercase tracking-widest text-center px-2`}>{sugg.label}</span>
                          </div>

                          {/* Hover State: Prompt text and action buttons */}
                          <div className="absolute inset-0 flex flex-col bg-white p-2.5 transition-all duration-300 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                            <span className={`text-[10px] ${textDark} font-medium leading-tight mb-1 flex-1 overflow-hidden`}>
                              "{sugg.prompt}"
                            </span>
                            <div className="flex justify-end gap-1.5 mt-auto">
                              <button
                                onClick={() => handleEditPrompt(sugg.prompt)}
                                className={`text-[9px] font-bold px-2 py-1 rounded border transition-colors ${cat.editBtnClass}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => sendIntervention(sugg.prompt, cat.actionType)}
                                disabled={isSending}
                                className={`text-[9px] font-bold px-2 py-1 rounded shadow-sm transition-colors ${cat.sendBtnClass} disabled:opacity-50`}
                              >
                                Send
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom Prompt Expandable Area */}
            <div className="mt-6">
              {!showCustomPrompt ? (
                <button
                  onClick={() => setShowCustomPrompt(true)}
                  className="w-full py-3.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold text-sm hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-lg leading-none mb-0.5">+</span> Write a Custom Prompt Override
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-green-200 bg-green-50/30 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-green-900/60 uppercase tracking-wider">Custom Prompt Override</h3>
                    <button onClick={() => setShowCustomPrompt(false)} className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors">✕ Close</button>
                  </div>

                  <div className="relative flex-1 flex flex-col">
                    <textarea
                      ref={customPromptRef}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Type a custom directive for the AI or a direct message to the patient..."
                      className="flex-1 w-full p-4 pb-14 rounded-xl border border-green-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm text-green-900 resize-none shadow-inner min-h-[120px]"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-3">
                      {toast && <span className={`text-xs font-medium ${toast.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{toast.text}</span>}
                      <button
                        onClick={() => sendIntervention(customMessage, 'Custom Prompt')}
                        disabled={isSending || !customMessage.trim()}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                      >
                        {isSending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Treatment plan */}
          <section className={cardCls}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-green-900">Curriculum Progress</h2>
                <div className="text-xs font-semibold px-2 py-1 bg-green-100/80 text-green-800 rounded-lg border border-green-200">
                  {state?.treatment_plan ? state.treatment_plan.filter(m => m.status === 'completed').length : 0} / {state?.treatment_plan?.length || 0} Modules
                </div>
              </div>
              {state?.active_worksheet_context && (
                <div className="mb-5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/60 rounded-xl flex items-start gap-3 shadow-sm">
                  <div className="text-amber-600 mt-0.5 text-lg">📝</div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-900/60 tracking-wider uppercase mb-0.5">Active Worksheet Context</div>
                    <div className="text-sm text-amber-950 font-medium leading-relaxed">{state.active_worksheet_context}</div>
                  </div>
                </div>
              )}
              <div className="mt-3">
                { renderPlan() }
              </div>
          </section>

          {/* PDF ingestion zone */}
          <div className={cardCls}>
            <h2 className="text-lg font-semibold text-green-900">Curriculum Ingestion</h2>
            <p className="text-sm text-green-900/60 mt-1">Drag & drop a PDF or click to upload. The Architect Agent will structure it into a treatment plan.</p>

            <div
              ref={dropRef}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`mt-4 border-2 border-dashed border-green-200 rounded-xl p-6 flex items-center justify-center text-center transition-all ${uploading ? 'bg-green-50/50 opacity-80' : 'bg-green-50/30 hover:bg-green-50 hover:border-green-300'}`}
              role="button"
              tabIndex={0}
              aria-label="Drop PDF here"
            >
              <div>
                <div className="text-green-900 font-semibold">{uploading ? 'Processing...' : 'Drop PDF here or click Upload'}</div>
                <div className="text-sm text-green-900/60 mt-1">Allowed file type: .pdf</div>
                <div className="mt-3">
                  <label htmlFor="main-pdf" className="inline-block px-4 py-2 bg-white text-green-800 border border-green-200 rounded-lg cursor-pointer hover:bg-green-50 transition-colors text-sm">Choose file</label>
                  <input id="main-pdf" type="file" accept="application/pdf" onChange={onFileChange} className="sr-only" />
                </div>
                {uploadMessage && <div className="mt-3 text-sm text-green-900/60">{uploadMessage}</div>}
              </div>
            </div>
          </div>

          {/* Session controls */}
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-green-900">Session</h2>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${sessionActive ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                {sessionActive ? '● In session' : 'Not in session'}
              </span>
            </div>
            <p className="text-sm text-green-900/60 mt-1">Start or end a session. Add progress notes after the session or during it.</p>

            <div className="mt-4 flex items-center gap-3">
              {!sessionActive ? (
                <>
                  <button onClick={openSessionModal} className="px-4 py-2 rounded-xl bg-green-700 text-white hover:bg-green-800 transition-colors font-medium" aria-haspopup="dialog">New Session</button>
                  <button onClick={()=>startSession()} className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors font-medium">Quick Start</button>
                </>
              ) : (
                <button onClick={()=>endSession()} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium">End Session</button>
              )}
              <button onClick={loadNotes} className="px-3 py-2 rounded-xl border border-green-200 text-green-800 hover:bg-green-50 transition-colors text-sm">Refresh Notes</button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-green-900">Progress Note</label>
              <textarea
                aria-label="Progress note"
                value={noteDraft}
                onChange={(e)=>setNoteDraft(e.target.value)}
                rows={4}
                className="mt-2 p-3 border border-green-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-green-900 placeholder-green-900/40"
                placeholder="Write a brief progress note for this session..."
              />
              <div className="mt-3 flex items-center gap-3">
                <button onClick={saveNote} className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-medium">Save Note</button>
                <button onClick={()=>setNoteDraft('')} className="px-3 py-2 rounded-xl border border-green-200 text-green-800 hover:bg-green-50 transition-colors text-sm">Clear</button>
                <div className="text-sm text-green-900/60">Last: {lastNotePreview ? `${lastNotePreview.author}: ${lastNotePreview.note}` : '—'}</div>
              </div>
            </div>
          </div>

          {/* Session Modal */}
          {showSessionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-green-900/20 backdrop-blur-sm" onClick={closeSessionModal} aria-hidden="true"></div>
              <div role="dialog" aria-modal="true" aria-label="New session" className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-green-200">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-green-900">New Session — {state?.name || ('Patient #' + patientId)}</h3>
                  <button onClick={closeSessionModal} aria-label="Close" className="text-green-900/50 hover:text-green-900 text-xl leading-none">✕</button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-green-900">Patient</label>
                    <input readOnly value={state?.name || ('Patient ' + patientId)} className="mt-2 p-2 border border-green-100 rounded-xl w-full bg-green-50/40 text-green-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-900">Patient ID</label>
                    <input readOnly value={patientId} className="mt-2 p-2 border border-green-100 rounded-xl w-full bg-green-50/40 text-green-900" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-green-900">Session Note</label>
                  <textarea
                    aria-label="Session note"
                    value={noteDraft}
                    onChange={(e)=>setNoteDraft(e.target.value)}
                    rows={6}
                    className="mt-2 p-3 border border-green-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-green-900 placeholder-green-900/40"
                    placeholder="Take progress notes here..."
                  />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button onClick={()=>{ startSession() }} className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors font-medium">Start Session</button>
                  <button onClick={saveNote} className="px-4 py-2 rounded-xl bg-green-700 text-white hover:bg-green-800 transition-colors font-medium">Save Note</button>
                  <button onClick={closeSessionModal} className="px-3 py-2 rounded-xl border border-green-200 text-green-800 hover:bg-green-50 transition-colors text-sm">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Module Modal */}
          {editingModule && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-green-950/30 backdrop-blur-sm" onClick={closeEditModule}></div>
              <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl p-6 border border-green-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold text-green-900">Edit Module</h3>
                  <button onClick={closeEditModule} className="text-green-900/40 hover:text-green-900 transition-colors text-xl leading-none">✕</button>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-1.5">Module Name</label>
                    <input value={modName} onChange={e=>setModName(e.target.value)} className="p-3 w-full border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white shadow-sm text-green-900 placeholder:text-green-900/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-1.5">Clinical Goal</label>
                    <textarea value={modGoal} onChange={e=>setModGoal(e.target.value)} rows={4} className="p-3 w-full border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white shadow-sm text-green-900 placeholder:text-green-900/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-1.5">Status</label>
                    <div className="relative">
                       <select value={modStatus} onChange={e=>setModStatus(e.target.value)} className="appearance-none p-3 w-full border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white shadow-sm text-green-900 font-medium">
                         <option value="pending">Pending (Active)</option>
                         <option value="completed">Completed</option>
                         <option value="locked">Locked (Hidden)</option>
                       </select>
                       <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-green-800/50">▼</div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-green-100">
                  <button onClick={closeEditModule} className="px-5 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-50 rounded-xl transition-colors">Cancel</button>
                  <button onClick={saveModule} className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95">Save Changes</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}