import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AuthProvider from './context/auth/Provider.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App /> 
  </StrictMode>
)
