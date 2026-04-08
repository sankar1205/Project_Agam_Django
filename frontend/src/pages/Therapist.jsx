import React, { useEffect, useState } from 'react'
import { API_BASE } from '../config'

// MUI
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Stack from '@mui/material/Stack'
import Input from '@mui/material/Input'
import LinearProgress from '@mui/material/LinearProgress'

// load pdfjs dynamically inside the handler to avoid Vite static import resolution issues

export default function Therapist(){
  const [patientId, setPatientId] = useState(1)
  const [state, setState] = useState(null)
  const [tone, setTone] = useState('')
  const [worksheet, setWorksheet] = useState('')
  const [checkin, setCheckin] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')

  const [pdfName, setPdfName] = useState('')
  const [pdfText, setPdfText] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const fileRef = React.useRef(null)

  async function load(){
    try{
      setStatus('Loading...')
      const r = await fetch(`${API_BASE}/patient/state/${patientId}`)
      if(!r.ok){
        const errText = await r.text()
        throw new Error(`Load failed: ${r.status} ${errText}`)
      }
      const data = await r.json()
      setState(data)
      setTone(data.therapist_tone || '')
      setWorksheet(data.active_worksheet_context || '')
      setCheckin(data.pending_checkin || '')
      setStatus('')
    }catch(e){
      setStatus(`Error loading patient: ${e.message}`)
    }
  }

  useEffect(()=>{ load() }, [patientId])

  async function sendUpdate(){
    setStatus('Saving...')
    const body = { therapist_tone: tone || null, active_worksheet_context: worksheet || null, pending_checkin: checkin || null }
    try{
      const r = await fetch(`${API_BASE}/therapist/update/${patientId}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      if(!r.ok){
        const text = await r.text()
        throw new Error(`Server returned ${r.status}: ${text}`)
      }
      const json = await r.json()
      setStatus(json.status || 'Updated')
      await load()
    }catch(e){
      setStatus(`Update failed: ${e.message}`)
    }
  }

  async function sendMessage(){
    if(!message.trim()) return
    setStatus('Sending message...')
    try{
      const r = await fetch(`${API_BASE}/therapist/message/${patientId}`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message }) })
      if(!r.ok){
        const text = await r.text()
        throw new Error(`Server returned ${r.status}: ${text}`)
      }
      const json = await r.json()
      setStatus(json.status || 'Message appended')
      setMessage('')
      await load()
    }catch(e){
      setStatus(`Send failed: ${e.message}`)
    }
  }

  async function handleFileChange(e){
    const file = e.target.files?.[0]
    if(!file) return
    if(file.type !== 'application/pdf'){
      setStatus('Please select a PDF file')
      return
    }

    setPdfName(file.name)
    setPdfText('')
    setPdfLoading(true)
    setStatus('Extracting PDF text...')

    try{
      const arrayBuffer = await file.arrayBuffer()
      // dynamically import pdfjs to avoid Vite's static import analyzer failing
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
      // set worker src from UNPKG for pdfjs
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.9.179/legacy/build/pdf.worker.min.js`
      const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise

      let fullText = ''
      for(let i=1;i<=pdf.numPages;i++){
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items.map(it => it.str).join(' ')
        fullText += `\n\n--- Page ${i} ---\n${pageText}`
        // avoid building extremely large strings in-memory; enforce a soft limit
        if(fullText.length > 120000){
          fullText = fullText.slice(0,120000) + '\n\n[Truncated additional content]'
          break
        }
      }

      setPdfText(fullText.trim())
      setStatus('PDF extracted')
    }catch(err){
      console.error(err)
      setStatus('Failed to extract PDF')
      setPdfText('')
      setPdfName('')
    }finally{
      setPdfLoading(false)
    }
  }

  async function appendPdfToHistory(){
    if(!pdfText) { setStatus('No PDF text to append'); return }
    setStatus('Appending PDF text to history...')
    try{
      const payload = { message: `PDF Upload (${pdfName}):\n\n${pdfText}` }
      const r = await fetch(`${API_BASE}/therapist/message/${patientId}`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      if(!r.ok){ const txt = await r.text(); throw new Error(`${r.status} ${txt}`) }
      const json = await r.json()
      setStatus(json.status || 'PDF appended')
      // reset preview
      setPdfName('')
      setPdfText('')
      if(fileRef.current) fileRef.current.value = ''
      await load()
    }catch(e){
      setStatus(`Append failed: ${e.message}`)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Therapist Dashboard</Typography>

      <Paper variant="outlined" sx={{p:2, mb:3}}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl sx={{minWidth:160}} size="small">
            <InputLabel id="patient-select-label">Patient</InputLabel>
            <Select
              labelId="patient-select-label"
              value={patientId}
              label="Patient"
              onChange={(e)=>setPatientId(Number(e.target.value))}
            >
              <MenuItem value={1}>1 - Jai</MenuItem>
              <MenuItem value={2}>2 - Test User 2</MenuItem>
              <MenuItem value={3}>3 - Test User 3</MenuItem>
            </Select>
          </FormControl>

          <Button variant="contained" onClick={load}>Reload</Button>
          <Typography color="text.secondary">{status}</Typography>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper className="card" sx={{p:2}}>
            <Typography variant="h6" gutterBottom>Patient State</Typography>
            <Box component="pre" sx={{background:'#fafafa', padding:2, borderRadius:1, overflowX:'auto'}}>
              {state ? JSON.stringify(state, null, 2) : 'Loading...'}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className="card" sx={{p:2}}>
            <Typography variant="h6" gutterBottom>Update Settings</Typography>

            <Box sx={{mb:2}}>
              <TextField label="Therapist Tone" value={tone} onChange={(e)=>setTone(e.target.value)} fullWidth size="small" />
            </Box>

            <Box sx={{mb:2}}>
              <TextField label="Worksheet Context" value={worksheet} onChange={(e)=>setWorksheet(e.target.value)} fullWidth size="small" />
            </Box>

            <Box sx={{mb:2}}>
              <TextField label="Pending Check-in" value={checkin} onChange={(e)=>setCheckin(e.target.value)} fullWidth size="small" />
            </Box>

            <Button variant="contained" fullWidth onClick={sendUpdate} sx={{mb:2}}>Save Settings</Button>

            <Typography variant="h6" sx={{mt:2}}>Send Therapist Message</Typography>
            <TextField value={message} onChange={(e)=>setMessage(e.target.value)} fullWidth multiline minRows={3} placeholder="Write a message to append to the patient's history" />
            <Button variant="outlined" sx={{mt:1}} fullWidth onClick={sendMessage}>Append Message to History</Button>

            <Box sx={{mt:3}}>
              <Typography variant="h6">Upload PDF (Therapist)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{mb:1}}>Upload a PDF to append its extracted text into the patient's history so the LLM can see it.</Typography>

              <input
                aria-label="Upload PDF"
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{display:'block', marginBottom:8}}
              />

              {pdfLoading && <LinearProgress />}

              {pdfName && (
                <Box sx={{mt:1}}>
                  <Typography variant="subtitle2">Preview: {pdfName}</Typography>
                  <TextField value={pdfText} multiline minRows={6} fullWidth size="small" sx={{mt:1}} InputProps={{readOnly:true}} />
                  <Stack direction="row" spacing={1} sx={{mt:1}}>
                    <Button variant="contained" onClick={appendPdfToHistory} disabled={!pdfText}>Append PDF text to history</Button>
                    <Button variant="outlined" onClick={()=>{ setPdfName(''); setPdfText(''); if(fileRef.current) fileRef.current.value='' }}>Clear</Button>
                  </Stack>
                </Box>
              )}

            </Box>

            <Typography variant="body2" color="text.secondary" sx={{mt:2}}><strong>Status:</strong> {status}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
