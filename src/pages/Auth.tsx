import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'

export function Auth() {
  const navigate = useNavigate()
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential

    if (!credential) {
      setError('Missing Google credential. Please try again.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await loginWithGoogle(credential)
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google'
      setError(message)
      setIsSubmitting(false)
    }
  }

  const handleError = () => {
    setError('Google sign in was cancelled or failed. Please try again.')
    setIsSubmitting(false)
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-6 sm:px-8 lg:px-12 xl:px-16">
      <div className="w-full max-w-[460px] space-y-8">
        <div className="text-center space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground"
          >
            Sign in
          </motion.h1>
          <p className="text-sm text-muted-foreground">
            Use Google to continue. We will sync your name and avatar from your Google account.
          </p>
        </div>

        <Card className="border-2 border-border shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-foreground">
                Continue with Google
              </div>
              {isSubmitting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing you in...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            {clientId ? (
              <div className={`flex justify-center ${isSubmitting ? 'pointer-events-none opacity-70' : ''}`}>
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={handleError}
                  // useOneTap={false}
                  // auto_select={false}
                  
                  shape="pill"
                  text="continue_with"
                  size="large"
                  width="340"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Google client ID is missing. Set `VITE_GOOGLE_CLIENT_ID` in your environment to enable sign in.
              </div>
            )}

            {error && (
              <div className="rounded-lg border-2 border-destructive bg-destructive/20 px-4 py-3 text-sm text-destructive font-semibold shadow-sm">
                {error}
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center">
              By continuing you agree to sign in with your Google account. Your display name and profile photo will be
              pulled from Google each time you log in.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
