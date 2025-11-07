import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/utils/cn'

export function Signup() {
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register({ name, email, password })
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDisabled = !name || !email || password.length < 8 || isSubmitting
  const passwordValid = password.length >= 8 || password.length === 0

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="space-y-2 sm:space-y-3 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Get started with KooyaHQ and manage your projects efficiently
          </p>
        </div>

        <Card className="border-2 border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1.5 pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">Sign up</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Enter your information to create your workspace
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                  Full name
                </Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setError(null)
                  }}
                  placeholder="John Doe"
                  className="h-11 text-base"
                  required
                  disabled={isSubmitting}
                />
              </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError(null)
                  }}
                  placeholder="Create a secure password"
                  className={cn(
                    'h-11 text-base',
                    !passwordValid && password.length > 0 && 'border-destructive focus-visible:ring-destructive',
                  )}
                  required
                  disabled={isSubmitting}
                />
                <p
                  className={cn(
                    'text-xs',
                    passwordValid || password.length === 0
                      ? 'text-muted-foreground'
                      : 'text-destructive',
                  )}
                >
                  {password.length === 0
                    ? 'Must be at least 8 characters long'
                    : password.length < 8
                      ? `At least ${8 - password.length} more character${8 - password.length === 1 ? '' : 's'} required`
                      : 'Password meets requirements'}
                </p>
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
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary transition-colors hover:text-primary/80 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
