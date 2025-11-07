import { MoonStar, Sun } from 'lucide-react'
import { type HTMLAttributes } from 'react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

type ThemeToggleProps = HTMLAttributes<HTMLButtonElement>

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      onClick={toggleTheme}
      aria-label="Toggle color scheme"
      {...props}
    >
      <Sun
        className={cn(
          'h-[1.2rem] w-[1.2rem] transition-opacity duration-150',
          isDark ? 'opacity-0 absolute' : 'opacity-100',
        )}
      />
      <MoonStar
        className={cn(
          'absolute h-[1.2rem] w-[1.2rem] transition-opacity duration-150',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
