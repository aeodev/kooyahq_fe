import { useAIAssistantStore } from '@/stores/ai-assistant.store'
import { useSocketStore } from '@/stores/socket.store'
import { sendAIMessage } from '@/hooks/socket/ai-assistant.socket'

export function TimerSelectionUI() {
  const socket = useSocketStore((s) => s.socket)
  const conversationId = useAIAssistantStore((s) => s.conversationId)
  const {
    selectedProjects,
    showSelections,
    clearSelections,
    confirmSelections,
    toggleProjectSelection,
  } = useAIAssistantStore()

  if (!showSelections || selectedProjects.length === 0) {
    return null
  }

  const handleConfirm = () => {
    const message = confirmSelections()
    if (message) {
      sendAIMessage(socket, message, conversationId)
    }
  }

  return (
    <div className="border-t border-border/30 bg-muted/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Selected Projects</h3>
        <button
          onClick={clearSelections}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <div className="mb-3">
        <div className="flex flex-wrap gap-1">
          {selectedProjects.map((project) => (
            <button
              key={project}
              onClick={() => toggleProjectSelection(project)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded border hover:bg-blue-200"
            >
              {project} ×
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={selectedProjects.length === 0}
        className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Start Timer
      </button>
    </div>
  )
}
