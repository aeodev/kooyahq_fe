import { Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMorganAI } from '@/composables/meet/useMorganAI'
import { cn } from '@/utils/cn'

interface MorganAIButtonProps {
  className?: string
}

export function MorganAIButton({ className }: MorganAIButtonProps) {
  const { isActive, state, toggle, error } = useMorganAI({ enabled: false })

  const getVariant = () => {
    if (error) return 'destructive'
    if (isActive) return 'default'
    return 'outline'
  }

  const getTitle = () => {
    if (error) return `Morgan AI: ${error}`
    if (state === 'listening') return 'Morgan AI: Listening...'
    if (state === 'processing') return 'Morgan AI: Processing...'
    if (state === 'speaking') return 'Morgan AI: Speaking...'
    if (isActive) return 'Morgan AI: Active'
    return 'Activate Morgan AI'
  }

  const isProcessing = state === 'processing' || state === 'speaking'

  return (
    <Button
      variant={getVariant()}
      size="icon"
      onClick={toggle}
      title={getTitle()}
      className={cn(
        'h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md',
        isActive && 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600',
        className
      )}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <Bot className={cn(
          'h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5',
          isActive && 'text-white'
        )} />
      )}
    </Button>
  )
}

