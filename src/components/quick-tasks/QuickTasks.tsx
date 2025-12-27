import { useState, useEffect, useRef, type KeyboardEvent, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListTodo, Plus, Check, X, Maximize2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface QuickTodo {
  id: string
  text: string
  done: boolean
  createdAt: number
}

// Shared Zustand store for syncing between modal and card
interface QuickTodosStore {
  todos: QuickTodo[]
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  updateTodo: (id: string, text: string) => void
  clearCompleted: () => void
}

const useQuickTodosStore = create<QuickTodosStore>()(
  persist(
    (set) => ({
      todos: [],
      addTodo: (text: string) => {
        if (!text.trim()) return
        set((state) => ({
          todos: [...state.todos, {
            id: crypto.randomUUID(),
            text: text.trim(),
            done: false,
            createdAt: Date.now()
          }]
        }))
      },
      toggleTodo: (id: string) => {
        set((state) => ({
          todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
        }))
      },
      removeTodo: (id: string) => {
        set((state) => ({
          todos: state.todos.filter(t => t.id !== id)
        }))
      },
      updateTodo: (id: string, text: string) => {
        set((state) => ({
          todos: state.todos.map(t => t.id === id ? { ...t, text } : t)
        }))
      },
      clearCompleted: () => {
        set((state) => ({
          todos: state.todos.filter(t => !t.done)
        }))
      }
    }),
    {
      name: 'kooyahq.quick-todos',
      storage: createJSONStorage(() => localStorage)
    }
  )
)

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s]+)/g

// Render text with clickable links and line breaks
function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_REGEX)
  
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          // Reset regex lastIndex
          URL_REGEX.lastIndex = 0
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:underline break-all"
            >
              {part.length > 40 ? part.slice(0, 40) + '...' : part}
            </a>
          )
        }
        // Handle line breaks
        return part.split('\n').map((line, j, arr) => (
          <Fragment key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </Fragment>
        ))
      })}
    </span>
  )
}

interface TodoItemProps {
  todo: QuickTodo
  onToggle: () => void
  onRemove: () => void
  compact?: boolean
  index?: number
}

function TodoItem({ todo, onToggle, onRemove, compact = false, index = 0 }: TodoItemProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        "group flex items-start gap-3 rounded-xl hover:bg-muted/40 transition-all duration-200",
        compact ? "p-2 -mx-1" : "p-3 -mx-2"
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          "shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 transition-all flex items-center justify-center",
          todo.done 
            ? "border-primary bg-primary" 
            : "border-border/60 hover:border-primary/60 hover:bg-primary/5"
        )}
      >
        <Check className={cn(
          "h-3 w-3 transition-all",
          todo.done ? "text-primary-foreground" : "text-transparent group-hover:text-muted-foreground/20"
        )} />
      </button>
      {/* Completed tasks: strikethrough + reduced opacity */}
      <div className={cn(
        "flex-1 min-w-0 text-sm transition-all",
        todo.done 
          ? "text-muted-foreground line-through opacity-50" 
          : "text-foreground/90",
        compact ? "line-clamp-2" : ""
      )}>
        <RichText text={todo.text} />
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 -m-1 mt-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

interface QuickTasksModalProps {
  open: boolean
  onClose: () => void
}

function QuickTasksModal({ open, onClose }: QuickTasksModalProps) {
  const { todos, addTodo, toggleTodo, removeTodo, clearCompleted } = useQuickTodosStore()
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
      e.preventDefault()
      addTodo(input)
      setInput('')
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Auto-resize textarea
  const handleInput = (value: string) => {
    setInput(value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  const pending = todos.filter(t => !t.done)
  const completed = todos.filter(t => t.done)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-lg mx-4 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <ListTodo className="h-4.5 w-4.5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Quick Tasks</h2>
              <span className="text-xs text-muted-foreground">
                {pending.length} pending
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Add Input */}
        <div className="p-5 border-b border-border/30 bg-muted/20">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a new task... (Shift+Enter for new line)"
              rows={1}
              className="w-full min-h-[44px] max-h-[120px] pl-4 pr-12 py-3 text-sm bg-background border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/50 resize-none transition-all"
            />
            {input && (
              <button
                onClick={() => { addTodo(input); setInput(''); if (textareaRef.current) textareaRef.current.style.height = 'auto' }}
                className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            Supports links and multi-line text
          </p>
        </div>

        {/* Todo List */}
        <div className="max-h-[400px] overflow-y-auto p-5">
          {todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <ListTodo className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No tasks yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add your first task above</p>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {pending.map((todo, i) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={() => toggleTodo(todo.id)}
                    onRemove={() => removeTodo(todo.id)}
                    index={i}
                  />
                ))}
              </AnimatePresence>
              
              {completed.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border/20">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Completed ({completed.length})
                    </span>
                    <button
                      onClick={clearCompleted}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {completed.map((todo, i) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={() => toggleTodo(todo.id)}
                        onRemove={() => removeTodo(todo.id)}
                        index={i}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

interface QuickTasksProps {
  className?: string
}

export function QuickTasks({ className }: QuickTasksProps) {
  const { todos, addTodo, toggleTodo, removeTodo } = useQuickTodosStore()
  const [input, setInput] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      addTodo(input)
      setInput('')
    }
  }

  const pending = todos.filter(t => !t.done)
  const completed = todos.filter(t => t.done)
  const displayTodos = [...pending.slice(0, 4), ...completed.slice(0, 1)].slice(0, 5)

  return (
    <>
      <Card className={cn("h-full flex flex-col", className)}>
        <CardHeader className="pb-4 pt-5 px-6 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <ListTodo className="h-4 w-4 text-violet-500" />
            </div>
            <span>Quick Tasks</span>
            {pending.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md tabular-nums font-bold">
                {pending.length}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted/60"
            onClick={() => setModalOpen(true)}
            title="Expand to full view"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col pt-0 px-6 pb-5">
          {/* Add Input */}
          <div className="relative mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a task..."
              className="w-full h-10 pl-4 pr-10 text-sm bg-muted/30 border border-border/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/50 transition-all"
            />
            {input && (
              <button
                onClick={() => { addTodo(input); setInput('') }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Todo List Preview */}
          <div className="flex-1 overflow-hidden">
            {todos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center mb-3">
                  <ListTodo className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">No tasks yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Type above to add one</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <AnimatePresence mode="popLayout">
                  {displayTodos.map((todo, i) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={() => toggleTodo(todo.id)}
                      onRemove={() => removeTodo(todo.id)}
                      compact
                      index={i}
                    />
                  ))}
                </AnimatePresence>
                {todos.length > 5 && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="w-full text-xs text-center text-primary hover:underline py-2 font-medium"
                  >
                    +{todos.length - 5} more tasks
                  </button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <QuickTasksModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
