import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lightbulb, Sparkles, RefreshCw, Quote, Laugh,
  Cat, Smile, Clock, Palette
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

// ============ QUOTES WIDGET ============
type QuoteSource = 'advice' | 'fact' | 'joke'

const QUOTE_SOURCES: { type: QuoteSource; label: string; icon: typeof Lightbulb }[] = [
  { type: 'advice', label: 'Wisdom', icon: Lightbulb },
  { type: 'fact', label: 'Facts', icon: Sparkles },
  { type: 'joke', label: 'Jokes', icon: Laugh },
]

function QuotesWidget() {
  const [source, setSource] = useState<QuoteSource>('advice')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchQuote = useCallback(async (type: QuoteSource) => {
    setLoading(true)
    try {
      let result = ''
      if (type === 'advice') {
        const res = await fetch('https://api.adviceslip.com/advice', { cache: 'no-store' })
        const data = await res.json()
        result = data.slip?.advice || 'Take a deep breath and enjoy the moment.'
      } else if (type === 'fact') {
        const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en')
        const data = await res.json()
        result = data.text || 'Honey never spoils!'
      } else {
        const res = await fetch('https://icanhazdadjoke.com/', { headers: { Accept: 'application/json' } })
        const data = await res.json()
        result = data.joke || "Why don't scientists trust atoms? They make up everything!"
      }
      setContent(result)
    } catch {
      setContent('Something wonderful is about to happen.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQuote(source)
  }, [source, fetchQuote])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {QUOTE_SOURCES.map((s) => (
            <Button
              key={s.type}
              variant={source === s.type ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSource(s.type)}
              className="h-7 text-xs gap-1.5"
            >
              <s.icon className="h-3 w-3" />
              {s.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => fetchQuote(source)}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <div className="min-h-[80px] flex items-center justify-center p-4 bg-muted/50 rounded-lg">
        <AnimatePresence mode="wait">
          <motion.p
            key={content}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-center font-medium leading-relaxed italic text-muted-foreground"
          >
            "{content}"
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============ PET WIDGET ============
const PET_STATES = ['idle', 'happy', 'sleepy', 'hungry'] as const
type PetState = typeof PET_STATES[number]

const PET_FACES: Record<PetState, string> = {
  idle: '(◕ᴗ◕)',
  happy: '(≧◡≦)',
  sleepy: '(－ω－)',
  hungry: '(◕︵◕)',
}

const PET_MESSAGES: Record<PetState, string[]> = {
  idle: ['*purrs*', '*blinks*', '*stretches*', '*yawns*'],
  happy: ['Yay!', 'Wheee!', 'Love you!', 'So happy!'],
  sleepy: ['zzz...', '*snore*', 'sleepy...', 'nap time'],
  hungry: ['feed me?', '*rumble*', 'snacks?', 'hungry...'],
}

function PetWidget() {
  const [state, setState] = useState<PetState>('idle')
  const [message, setMessage] = useState('')
  const [hearts, setHearts] = useState(0)

  const pet = () => {
    setState('happy')
    setHearts((h) => h + 1)
    setMessage(PET_MESSAGES.happy[Math.floor(Math.random() * PET_MESSAGES.happy.length)])
    setTimeout(() => {
      setState('idle')
      setMessage(PET_MESSAGES.idle[Math.floor(Math.random() * PET_MESSAGES.idle.length)])
    }, 2000)
  }

  useEffect(() => {
    setMessage(PET_MESSAGES.idle[0])
    const interval = setInterval(() => {
      if (state === 'idle') {
        const rand = Math.random()
        if (rand < 0.3) {
          setState('sleepy')
          setMessage(PET_MESSAGES.sleepy[Math.floor(Math.random() * PET_MESSAGES.sleepy.length)])
        } else if (rand < 0.5) {
          setState('hungry')
          setMessage(PET_MESSAGES.hungry[Math.floor(Math.random() * PET_MESSAGES.hungry.length)])
        } else {
          setMessage(PET_MESSAGES.idle[Math.floor(Math.random() * PET_MESSAGES.idle.length)])
        }
        setTimeout(() => setState('idle'), 3000)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [state])

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-4">
      <motion.button
        onClick={pet}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="text-4xl font-mono cursor-pointer select-none relative p-4 rounded-full hover:bg-muted/50 transition-colors"
      >
        {PET_FACES[state]}
        {state === 'happy' && (
          <motion.span
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [1, 0], y: -20 }}
            className="absolute -top-2 -right-2 text-xl"
          >
            💕
          </motion.span>
        )}
      </motion.button>
      
      <div className="text-center space-y-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground italic h-5"
          >
            {message}
          </motion.p>
        </AnimatePresence>
        <p className="text-xs text-muted-foreground/60">
          Total Pets: {hearts}
        </p>
      </div>
    </div>
  )
}

// ============ MOOD WIDGET ============
const MOODS = [
  { emoji: '😊', label: 'Great' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😔', label: 'Meh' },
  { emoji: '😢', label: 'Bad' },
]

function MoodWidget() {
  const [selectedMood, setSelectedMood] = useState<number | null>(() => {
    const saved = localStorage.getItem('daily-mood')
    if (saved) {
      const { mood, date } = JSON.parse(saved)
      if (date === new Date().toDateString()) return mood
    }
    return null
  })

  const selectMood = (index: number) => {
    setSelectedMood(index)
    localStorage.setItem('daily-mood', JSON.stringify({ mood: index, date: new Date().toDateString() }))
  }

  return (
    <div className="flex flex-col items-center justify-center py-2 space-y-4">
      <p className="text-sm font-medium text-muted-foreground">How are you feeling today?</p>
      <div className="flex items-center justify-center gap-2">
        {MOODS.map((mood, i) => (
          <motion.button
            key={mood.label}
            onClick={() => selectMood(i)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className={`text-2xl p-2 rounded-lg transition-all ${
              selectedMood === i ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'hover:bg-muted'
            }`}
            title={mood.label}
          >
            {mood.emoji}
          </motion.button>
        ))}
      </div>
      <div className="h-5">
        {selectedMood !== null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-center text-primary font-medium"
          >
            Feeling {MOODS[selectedMood].label.toLowerCase()} today
          </motion.p>
        )}
      </div>
    </div>
  )
}

// ============ POMODORO WIDGET ============
function PomodoroWidget() {
  const [seconds, setSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<'work' | 'break'>('work')

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setIsRunning(false)
          setMode((m) => {
            const newMode = m === 'work' ? 'break' : 'work'
            return newMode
          })
          // Return seconds for new mode (work = 25min, break = 5min)
          return mode === 'work' ? 5 * 60 : 25 * 60
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, mode])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const progress = mode === 'work' ? (25 * 60 - seconds) / (25 * 60) : (5 * 60 - seconds) / (5 * 60)

  const reset = () => {
    setIsRunning(false)
    setSeconds(mode === 'work' ? 25 * 60 : 5 * 60)
  }

  return (
    <div className="flex flex-col items-center space-y-4 py-2">
      <div className="flex gap-2">
         <div className="flex p-1 bg-muted rounded-md">
            <button
              onClick={() => { setMode('work'); setSeconds(25 * 60); setIsRunning(false) }}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${mode === 'work' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Work
            </button>
            <button
              onClick={() => { setMode('break'); setSeconds(5 * 60); setIsRunning(false) }}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${mode === 'break' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Break
            </button>
         </div>
      </div>

      <div className="relative">
        <svg className="w-24 h-24 -rotate-90">
          <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
          <circle
            cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6"
            className="text-primary transition-all duration-1000"
            strokeDasharray={251.32}
            strokeDashoffset={251.32 * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums tracking-tight">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => setIsRunning(!isRunning)}
          className={isRunning ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  )
}

// ============ COLORS WIDGET ============
function ColorsWidget() {
  const [palette, setPalette] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const generatePalette = useCallback(() => {
    const hue = Math.floor(Math.random() * 360)
    const colors = [
      `hsl(${hue}, 70%, 85%)`,
      `hsl(${hue}, 60%, 65%)`,
      `hsl(${(hue + 30) % 360}, 55%, 55%)`,
      `hsl(${(hue + 60) % 360}, 50%, 45%)`,
      `hsl(${(hue + 90) % 360}, 45%, 35%)`,
    ]
    setPalette(colors)
  }, [])

  useEffect(() => {
    generatePalette()
  }, [generatePalette])

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color)
    setCopied(color)
    setTimeout(() => setCopied(null), 1000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Inspiration</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={generatePalette}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex h-16 rounded-lg overflow-hidden border">
        {palette.map((color, i) => (
          <motion.button
            key={i}
            onClick={() => copyColor(color)}
            whileHover={{ flex: 2 }}
            className="flex-1 relative cursor-copy transition-all duration-300"
            style={{ backgroundColor: color }}
            title={color}
          >
            {copied === color && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-medium"
              >
                Copied
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ============ MAIN WIDGET ============
interface EntertainmentWidgetsProps {
  className?: string
}

export function EntertainmentWidgets({ className }: EntertainmentWidgetsProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Break Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quotes" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="quotes" title="Quotes"><Quote className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="pet" title="Pet"><Cat className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="mood" title="Mood"><Smile className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="focus" title="Focus"><Clock className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="colors" title="Colors"><Palette className="h-4 w-4" /></TabsTrigger>
          </TabsList>
          
          <div className="min-h-[160px]">
            <TabsContent value="quotes" className="mt-0"><QuotesWidget /></TabsContent>
            <TabsContent value="pet" className="mt-0"><PetWidget /></TabsContent>
            <TabsContent value="mood" className="mt-0"><MoodWidget /></TabsContent>
            <TabsContent value="focus" className="mt-0"><PomodoroWidget /></TabsContent>
            <TabsContent value="colors" className="mt-0"><ColorsWidget /></TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
