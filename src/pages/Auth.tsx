import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/utils/cn'
import { PERMISSION_LIST, PERMISSIONS } from '@/constants/permissions'

type AuthMode = 'signin' | 'signup'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export function Auth() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  
  const [mode, setMode] = useState<AuthMode>('signin')
  const [formData, setFormData] = useState({ name: '', email: '', password: '', permissions: [] as string[] })
  const [uiState, setUIState] = useState({
    showPassword: false,
    emailTouched: false,
    error: null as string | null,
    isSubmitting: false,
  })

  // Validation helpers
  const isValidEmail = (email: string) => email.length === 0 || EMAIL_REGEX.test(email)
  const isValidPassword = (password: string) => password.length >= MIN_PASSWORD_LENGTH || password.length === 0
  
  const emailValid = isValidEmail(formData.email)
  const passwordValid = isValidPassword(formData.password)
  const shouldShowEmailError = uiState.emailTouched && formData.email.length > 0 && !emailValid
  
  const isFormValid = mode === 'signin'
    ? formData.email && formData.password && emailValid
    : formData.name && formData.email && formData.password && emailValid && passwordValid && formData.permissions.length > 0
  
  const isDisabled = !isFormValid || uiState.isSubmitting

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', permissions: [] })
    setUIState(prev => ({ ...prev, showPassword: false, emailTouched: false, error: null }))
  }

  const switchMode = (newMode: AuthMode) => {
    if (newMode !== mode) {
      setMode(newMode)
      resetForm()
    }
  }

  const updateField = (field: Exclude<keyof typeof formData, 'permissions'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (uiState.error) setUIState(prev => ({ ...prev, error: null }))
  }

  const togglePermission = (value: string) => {
    setFormData((prev) => {
      const existing = new Set(prev.permissions)
      if (existing.has(value)) {
        existing.delete(value)
      } else {
        existing.add(value)
      }
      // If full access selected, replace with only full access
      if (existing.has(PERMISSIONS.SYSTEM_FULL_ACCESS)) {
        return { ...prev, permissions: [PERMISSIONS.SYSTEM_FULL_ACCESS] }
      }
      return { ...prev, permissions: Array.from(existing) }
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUIState(prev => ({ ...prev, error: null, isSubmitting: true }))

    try {
      if (mode === 'signin') {
        await login({ email: formData.email, password: formData.password })
      } else {
        await register({ name: formData.name, email: formData.email, password: formData.password, permissions: formData.permissions })
      }
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : mode === 'signin' ? 'Unable to log in' : 'Unable to create account'
      setUIState(prev => ({ ...prev, error: message, isSubmitting: false }))
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-6 sm:px-8 lg:px-12 xl:px-16">
      <div className="w-full max-w-[500px] space-y-10">
        {/* Header - bold and confident */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.h1
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground"
              style={{ fontStyle: 'normal', fontFamily: 'inherit' }}
            >
              {mode === 'signin' ? 'Welcome back' : 'Get started'}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Card - larger, more substantial, confident */}
        <Card className="border-2 border-border shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] bg-card overflow-hidden relative">
          
          {/* Mode Toggle Tabs - more premium */}
          <div className="relative flex border-b border-border/60 bg-muted/30">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={cn(
                "flex-1 py-4 text-sm font-semibold transition-all duration-200 relative z-10",
                mode === 'signin' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={cn(
                "flex-1 py-4 text-sm font-semibold transition-all duration-200 relative z-10",
                mode === 'signup' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              Sign up
            </button>
            {/* Animated tab indicator - thicker and more visible */}
            <motion.div
              className="absolute bottom-0 h-[2px] bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
              initial={false}
              animate={{
                left: mode === 'signin' ? '0%' : '50%',
                width: '50%'
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          </div>

          <CardHeader className="pb-1">
            {/* Removed redundant heading - tabs already indicate mode */}
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'signin' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'signin' ? 20 : -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
                onSubmit={handleSubmit}
                noValidate
              >
                {/* Name field - only for signup */}
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                      Full name
                    </Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="John Doe"
                      className="h-12 text-base border-2 border-border/80 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all"
                      required
                      disabled={uiState.isSubmitting}
                    />
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onBlur={() => setUIState(prev => ({ ...prev, emailTouched: true }))}
                    placeholder="name@kooya.com"
                    className={cn(
                      "h-12 text-base border-2 border-border/80 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all",
                      shouldShowEmailError && "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/40"
                    )}
                    required
                    disabled={uiState.isSubmitting}
                  />
                  {shouldShowEmailError && (
                    <p className="text-xs font-medium text-destructive">
                      Please enter a valid email address
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={uiState.showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder={mode === 'signin' ? 'Enter your password' : 'Create a secure password'}
                      className={cn(
                        'h-12 text-base border-2 border-border/80 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all pr-10',
                        mode === 'signup' && !passwordValid && formData.password.length > 0 && 'border-destructive focus-visible:ring-destructive',
                      )}
                      required
                      disabled={uiState.isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setUIState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={uiState.showPassword ? 'Hide password' : 'Show password'}
                    >
                      {uiState.showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Implement forgot password flow
                        console.log('Forgot password clicked')
                      }}
                      className="text-sm font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                  {mode === 'signup' && (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        passwordValid || formData.password.length === 0
                          ? 'text-muted-foreground'
                          : 'text-destructive',
                      )}
                    >
                      {formData.password.length === 0
                        ? `Must be at least ${MIN_PASSWORD_LENGTH} characters long`
                        : formData.password.length < MIN_PASSWORD_LENGTH
                          ? `At least ${MIN_PASSWORD_LENGTH - formData.password.length} more character${MIN_PASSWORD_LENGTH - formData.password.length === 1 ? '' : 's'} required`
                          : 'Password meets requirements'}
                    </p>
                  )}
                </div>

                {mode === 'signup' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      Permissions (testing)
                    </Label>
                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 max-h-64 overflow-y-auto space-y-2">
                      {PERMISSION_LIST.map((perm) => {
                        const checked = formData.permissions.includes(perm.value)
                        const isFullAccess = perm.value === PERMISSIONS.SYSTEM_FULL_ACCESS
                        const fullSelected = formData.permissions.includes(PERMISSIONS.SYSTEM_FULL_ACCESS)
                        const disabled = fullSelected && !checked && !isFullAccess
                        return (
                          <label
                            key={perm.value}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border border-transparent px-2 py-1.5 cursor-pointer transition-colors',
                              checked ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50'
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              checked={checked}
                              disabled={disabled || uiState.isSubmitting}
                              onChange={() => togglePermission(perm.value)}
                            />
                            <div className="space-y-0.5">
                              <div className="text-sm font-semibold text-foreground">{perm.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {perm.description ?? perm.value}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select one or more permissions. Choosing “Full Access” overrides and grants all actions.
                    </p>
                  </div>
                )}

                {uiState.error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg border-2 border-destructive bg-destructive/20 px-4 py-3 text-sm text-destructive font-semibold shadow-sm"
                    role="alert"
                  >
                    {uiState.error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={isDisabled}
                  className={cn(
                    "h-12 w-full text-base font-semibold shadow-lg transition-all duration-200",
                    isDisabled 
                      ? "bg-muted text-foreground/50 cursor-not-allowed hover:scale-100 hover:shadow-lg border border-border/50" 
                      : "bg-primary hover:bg-primary/95 text-primary-foreground hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                  )}
                  size="lg"
                >
                  {uiState.isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </span>
                  ) : (
                    mode === 'signin' ? 'Sign in' : 'Create account'
                  )}
                </Button>
              </motion.form>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
