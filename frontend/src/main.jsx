import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

// MUI theme provider
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#10b981', // Emerald Green
      dark: '#059669',
      light: '#34d399',
    },
    secondary: {
      main: '#0f766e', // Deep Teal
    },
    background: {
      default: '#f4fbf7', // Very soft mint/off-white background
      paper: '#ffffff'
    },
    text: {
      primary: '#1a3b2b', // Deep forest green for readability
      secondary: '#5b6876' // Soft slate for subtitles
    }
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 } // Removes the default ALL CAPS from MUI buttons
  },
  shape: { borderRadius: 16 }, // Softer, modern corners for cards and buttons
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 24px rgba(16, 185, 129, 0.04)',
          border: '1px solid #eef5f1'
        }
      }
    }
  }
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)