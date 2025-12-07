import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/utils/cn'
import { SplineScene } from '@/components/SplineScene'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to log in'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDisabled = !email || !password || isSubmitting

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex h-full w-full items-center justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-8 sm:py-12"
      >
        <div className="flex w-full items-center justify-center gap-12 lg:gap-16 xl:gap-20">
          <motion.div
            layoutId="spline-scene"
            initial={{ x: -200, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 200, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center"
          >
            <div className="h-[800px] w-full">
              <SplineScene />
            </div>
          </motion.div>
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="space-y-2 sm:space-y-3 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sign in to your account to continue your work
          </p>
        </div>

        <Card className="border-2 border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1.5 pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">Sign in</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Enter your credentials to access your workspace
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError(null)
                  }}
                  placeholder="name@company.com"
                  className="h-11 text-base"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError(null)
                  }}
                  placeholder="Enter your password"
                  className="h-11 text-base"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div
                  className={cn(
                    'rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive',
                  )}
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isDisabled}
                className="h-11 w-full text-base font-semibold shadow-sm"
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
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold text-primary transition-colors hover:text-primary/80 underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
        </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
