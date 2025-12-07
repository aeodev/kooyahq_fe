import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/utils/cn'
import { SplineScene } from '@/components/SplineScene'

type AuthMode = 'login' | 'signup'

export function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<AuthMode>(location.pathname === '/signup' ? 'signup' : 'login')

  useEffect(() => {
    const newMode = location.pathname === '/signup' ? 'signup' : 'login'
    if (newMode !== mode) {
      setMode(newMode)
      setError(null)
    }
  }, [location.pathname, mode])
  
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError(null)
    navigate(newMode === 'signup' ? '/signup' : '/login', { replace: true })
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login({ email: loginEmail, password: loginPassword })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register({ name: signupName, email: signupEmail, password: signupPassword })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const loginDisabled = !loginEmail || !loginPassword || isSubmitting
  const signupDisabled = !signupName || !signupEmail || signupPassword.length < 8 || isSubmitting
  const passwordValid = signupPassword.length >= 8 || signupPassword.length === 0

  return (
    <div className="flex h-full w-full items-center justify-center px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
      <div className="flex w-full max-w-6xl items-center justify-center gap-8 lg:gap-12">
        {/* Spline Scene */}
        <div className="hidden lg:flex lg:w-2/5 lg:items-center lg:justify-center">
          <div className="h-[650px] w-full max-w-md">
            <SplineScene />
          </div>
        </div>

        {/* Auth Form */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-[420px]">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {mode === 'login' ? 'Welcome back' : 'Get started'}
              </h1>
              <p className="text-muted-foreground">
                {mode === 'login' 
                  ? 'Sign in to continue to KooyaHQ' 
                  : 'Create an account to get started'}
              </p>
            </div>

            {/* Toggle */}
            <div className="mb-6 flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={cn(
                  'flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-200',
                  mode === 'login'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={cn(
                  'flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-200',
                  mode === 'signup'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Sign up
              </button>
            </div>

            {/* Form Card */}
            <Card className="border shadow-lg">
              <CardContent className="p-6 sm:p-8">
                <AnimatePresence mode="wait">
                  {mode === 'login' ? (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                      onSubmit={handleLogin}
                      noValidate
                    >
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-sm font-medium">
                          Email
                        </Label>
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value)
                            setError(null)
                          }}
                          placeholder="you@example.com"
                          className="h-11"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-sm font-medium">
                          Password
                        </Label>
                        <Input
                          id="login-password"
                          type="password"
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value)
                            setError(null)
                          }}
                          placeholder="••••••••"
                          className="h-11"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      {error && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                          {error}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loginDisabled}
                        className="w-full h-11 font-medium"
                        size="lg"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Signing in...
                          </span>
                        ) : (
                          'Sign in'
                        )}
                      </Button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="signup"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                      onSubmit={handleSignup}
                      noValidate
                    >
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm font-medium">
                          Full name
                        </Label>
                        <Input
                          id="signup-name"
                          autoComplete="name"
                          value={signupName}
                          onChange={(e) => {
                            setSignupName(e.target.value)
                            setError(null)
                          }}
                          placeholder="John Doe"
                          className="h-11"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium">
                          Email
                        </Label>
                        <Input
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          value={signupEmail}
                          onChange={(e) => {
                            setSignupEmail(e.target.value)
                            setError(null)
                          }}
                          placeholder="you@example.com"
                          className="h-11"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">
                          Password
                        </Label>
                        <Input
                          id="signup-password"
                          type="password"
                          autoComplete="new-password"
                          value={signupPassword}
                          onChange={(e) => {
                            setSignupPassword(e.target.value)
                            setError(null)
                          }}
                          placeholder="••••••••"
                          className={cn(
                            'h-11',
                            !passwordValid && signupPassword.length > 0 && 'border-destructive focus-visible:ring-destructive'
                          )}
                          required
                          disabled={isSubmitting}
                        />
                        {signupPassword.length > 0 && (
                          <p className={cn(
                            'text-xs',
                            passwordValid ? 'text-muted-foreground' : 'text-destructive'
                          )}>
                            {signupPassword.length < 8
                              ? `At least ${8 - signupPassword.length} more character${8 - signupPassword.length === 1 ? '' : 's'}`
                              : 'Password meets requirements'}
                          </p>
                        )}
                      </div>

                      {error && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                          {error}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={signupDisabled}
                        className="w-full h-11 font-medium"
                        size="lg"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Creating account...
                          </span>
                        ) : (
                          'Create account'
                        )}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}






