import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-12">
      <div className="mx-auto w-full max-w-md">
        <Card className="border border-border/80 bg-card/95 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
          <CardHeader className="space-y-2 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sign in</p>
              <div className="text-2xl font-semibold leading-tight text-foreground">Welcome to KooyaHQ</div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pb-7">
            {clientId ? (
              <div
                className={`rounded-2xl border border-border/70 bg-background/85 px-4 py-5 ${
                  isSubmitting ? 'pointer-events-none opacity-70' : ''
                }`}
              >
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                    shape="pill"
                    text="continue_with"
                    size="large"
                    width="340"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Google client ID missing. Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable sign in.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm font-semibold text-destructive shadow-sm">
                {error}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Your Google name and photo sync on each login.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
