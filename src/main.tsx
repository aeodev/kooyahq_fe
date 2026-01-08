import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from '@/App'
import '@/index.css'
import { startKooyaFaviconAnimation } from '@/utils/animated-favicon'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

startKooyaFaviconAnimation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
