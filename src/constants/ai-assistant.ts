/**
 * AI Assistant UI strings
 * Extracted for future internationalization support
 */
export const AI_ASSISTANT_STRINGS = {
  // Header
  title: 'Kooya AI',
  clearConversation: 'Clear conversation',
  close: 'Close AI assistant',

  // Empty state
  emptyStateMessage: 'Ask me anything — time tracking, tickets, or tasks.',
  suggestions: {
    startTimer: 'Start timer',
    whatAmIWorkingOn: 'What am I working on?',
    createTicket: 'Create a ticket',
  },

  // Input
  inputPlaceholder: 'Ask something...',
  inputDescription: 'Type your message and press Enter to send, or Escape to close',
  sendMessage: 'Send message',

  // Tool badges
  toolRunning: (name: string) => `Tool ${name} is running`,
  toolComplete: (name: string) => `Tool ${name} is complete`,
  toolError: (name: string) => `Tool ${name} has error`,
  toolsExecuting: (count: number) => `${count} tool${count > 1 ? 's' : ''} executing`,

  // Status messages
  aiThinking: 'AI is thinking',
  aiResponseStreaming: 'AI response streaming',
  userMessage: 'User message',
  assistantMessage: 'Assistant message',

  // Quick replies
  quickReply: (label: string) => `Quick reply: ${label}`,
  useSuggestion: (suggestion: string) => `Use suggestion: ${suggestion}`,

  // Error messages
  errorTitle: 'AI Assistant Error',
  errorMessage: 'Something went wrong with the AI assistant. You can try again or refresh the page.',
  errorDetails: 'Error details',
  tryAgain: 'Try Again',
  refreshPage: 'Refresh Page',
} as const

