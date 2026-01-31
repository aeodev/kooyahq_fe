import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth.store'

export function Auth() {
  const navigate = useNavigate()
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle)
  const { isDark } = useTheme()
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
      <div className="mx-auto w-full max-w-[420px]">
        <Card className="border border-border/80 bg-card/95 text-card-foreground shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-none hover:shadow-[0_12px_30px_rgba(0,0,0,0.16)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.65)]">
          <CardContent className="space-y-7 p-8">
            <div className="space-y-4">
              <div className="flex justify-center sm:justify-start">
                <span
                  role="img"
                  aria-label="KooyaHQ"
                  className="inline-block h-8 aspect-[800/264] bg-primary"
                  style={{
                    maskImage: "url('/kooya-logo-white.png')",
                    maskRepeat: 'no-repeat',
                    maskSize: 'contain',
                    maskPosition: 'center',
                    WebkitMaskImage: "url('/kooya-logo-white.png')",
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskSize: 'contain',
                    WebkitMaskPosition: 'center',
                  }}
                />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  Log in to KooyaHQ
                </div>
                <p className="text-sm text-muted-foreground">
                  Sign in with Google to continue to KooyaHQ.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {clientId ? (
                <div className={`flex justify-center ${isSubmitting ? 'pointer-events-none opacity-70' : ''}`}>
                  <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                    shape="pill"
                    text="continue_with"
                    size="large"
                    theme={isDark ? 'filled_black' : 'outline'}
                    width="340"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Google client ID missing. Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable sign in.
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm font-semibold text-destructive">
                  {error}
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Secure connection via Google Auth.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          By clicking continue, you agree to our{' '}
          <a className="text-primary underline-offset-4 hover:underline" href="/terms">
            Terms of Service
          </a>{' '}
          and{' '}
          <a className="text-primary underline-offset-4 hover:underline" href="/privacy">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  )
}
