import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { CheckCircle2, Clock3, Shield } from 'lucide-react'

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

  const highlights = [
    {
      icon: Shield,
      title: 'Google-only sign in',
      description: 'Works with your Kooya Google account. No KooyaHQ passwords to store.',
    },
    {
      icon: CheckCircle2,
      title: 'Keeps you current',
      description: 'Name and avatar sync from Google every time you log in.',
    },
    {
      icon: Clock3,
      title: 'Fast re-entry',
      description: 'Pick up where you left off in under a minute.',
    },
  ]

  const reminders = [
    'Use your Kooya Google account (employees and clients).',
    'Nothing extra to install—one tap with Google.',
    'Need a different account? Sign out from your profile menu.',
  ]

  const workspaceUses = [
    {
      title: 'Employee hub',
      body: 'Projects, time entries, announcements, and presence in one place so teams stay aligned.',
    },
    {
      title: 'Client portal',
      body: 'Shared updates, files, and checkpoints so clients see progress without chasing status.',
    },
  ]

  const capabilities = [
    {
      title: 'Design craft',
      items: ['Brand identity', 'Product & UI/UX', 'Packaging and graphics'],
    },
    {
      title: 'AI builds',
      items: ['NLP, chat, voice', 'Computer vision', 'Predictive and analytics'],
    },
    {
      title: 'Integration',
      items: ['Workflow automation', 'Domain-specific models', 'Secure delivery and support'],
    },
  ]

  const workingStyle = [
    {
      title: 'Strategy first',
      detail: 'We align on goals before design or code. Clear scopes, clear owners.',
    },
    {
      title: 'Build in the open',
      detail: 'Clients see progress inside KooyaHQ—no hidden workstreams or surprise handoffs.',
    },
    {
      title: 'Tight feedback loops',
      detail: 'Short review cycles keep design and AI experiments grounded in real use.',
    },
  ]

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid items-start gap-8 sm:gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              KooyaHQ portal
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-semibold leading-tight tracking-tight text-foreground">
                Sign in with Google
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
                Access the KooyaHQ workspace for employees and clients. Kooya is a design + AI company—this portal keeps
                project work, time tracking, and client updates in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {highlights.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-4"
                >
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">{title}</div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Before you continue
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                {reminders.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary/80" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08 }}
            className="w-full"
          >
            <Card className="border border-border/80 bg-card/95 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
              <CardHeader className="space-y-3 pb-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sign in</p>
                  <div className="text-2xl font-semibold leading-tight text-foreground">Continue with Google</div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use the Google account tied to your KooyaHQ workspace. It respects your domain policies and keeps your
                  profile in sync.
                </p>
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
                    <div className="mt-3 text-center text-xs text-muted-foreground">
                      Stay signed in to return to projects faster.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Google client ID is missing. Set `VITE_GOOGLE_CLIENT_ID` in your environment to enable sign in.
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm font-semibold text-destructive shadow-sm">
                    {error}
                  </div>
                )}

                  <div className="text-xs text-muted-foreground text-center leading-relaxed">
                    By continuing you agree to sign in with your Google account. Your display name and profile photo will be
                    pulled from Google each time you log in.
                  </div>
                </CardContent>
              </Card>
          </motion.div>
        </div>

        <div className="mt-14 sm:mt-16 space-y-10 sm:space-y-12">
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-foreground">What KooyaHQ is for</h2>
              <p className="text-sm text-muted-foreground">
                A practical workspace for Kooya employees and clients—built to keep design and AI projects moving.
              </p>
            </div>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {workspaceUses.map((item) => (
                <Card key={item.title} className="border border-border/70 bg-background/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">{item.body}</CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-foreground">What Kooya builds</h2>
              <p className="text-sm text-muted-foreground">
                Strategy, design, and AI shipped together—so branding, UX, and intelligence land as one experience.
              </p>
            </div>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
              {capabilities.map((group) => (
                <Card key={group.title} className="border border-border/70 bg-background/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{group.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="space-y-1 text-sm text-muted-foreground leading-relaxed">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary/80" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-foreground">How we work</h2>
              <p className="text-sm text-muted-foreground">
                Calm delivery, clear check-ins, and security-first access for every stakeholder.
              </p>
            </div>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
              {workingStyle.map((item) => (
                <Card key={item.title} className="border border-border/70 bg-background/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">{item.detail}</CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
