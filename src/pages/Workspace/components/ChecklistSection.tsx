import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBoardStore } from '@/stores/board.store'
import type { Card, Checklist, ChecklistItem } from '@/types/board'
import { Check, Plus, X, Trash2, Edit2 } from 'lucide-react'

type ChecklistSectionProps = {
  card: Card
  onUpdate: () => void
}

export function ChecklistSection({ card, onUpdate }: ChecklistSectionProps) {
  const {
    createChecklist,
    updateChecklist,
    deleteChecklist,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
  } = useBoardStore()

  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('')
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({})
  const [editingItemIds, setEditingItemIds] = useState<Record<string, string>>({})
  const [editingItemTexts, setEditingItemTexts] = useState<Record<string, string>>({})

  const checklists = card.checklists || []

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return
    await createChecklist(card.id, newChecklistTitle.trim())
    setNewChecklistTitle('')
    onUpdate()
  }

  const handleUpdateChecklist = async (checklistId: string) => {
    if (!editingChecklistTitle.trim()) return
    await updateChecklist(card.id, checklistId, { title: editingChecklistTitle.trim() })
    setEditingChecklistId(null)
    setEditingChecklistTitle('')
    onUpdate()
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (confirm('Are you sure you want to delete this checklist?')) {
      await deleteChecklist(card.id, checklistId)
      onUpdate()
    }
  }

  const handleCreateItem = async (checklistId: string) => {
    const text = newItemTexts[checklistId]
    if (!text?.trim()) return
    await createChecklistItem(card.id, checklistId, text.trim())
    setNewItemTexts({ ...newItemTexts, [checklistId]: '' })
    onUpdate()
  }

  const handleToggleItem = async (checklistId: string, itemId: string, completed: boolean) => {
    await updateChecklistItem(card.id, checklistId, itemId, { completed: !completed })
    onUpdate()
  }

  const handleStartEditItem = (checklistId: string, itemId: string, text: string) => {
    setEditingItemIds({ ...editingItemIds, [checklistId]: itemId })
    setEditingItemTexts({ ...editingItemTexts, [`${checklistId}-${itemId}`]: text })
  }

  const handleUpdateItem = async (checklistId: string, itemId: string) => {
    const text = editingItemTexts[`${checklistId}-${itemId}`]
    if (!text?.trim()) return
    await updateChecklistItem(card.id, checklistId, itemId, { text: text.trim() })
    setEditingItemIds({ ...editingItemIds, [checklistId]: '' })
    setEditingItemTexts({ ...editingItemTexts, [`${checklistId}-${itemId}`]: '' })
    onUpdate()
  }

  const handleDeleteItem = async (checklistId: string, itemId: string) => {
    await deleteChecklistItem(card.id, checklistId, itemId)
    onUpdate()
  }

  const getChecklistProgress = (checklist: Checklist) => {
    const total = checklist.items.length
    const completed = checklist.items.filter((item) => item.completed).length
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Checklists</h3>
      </div>

      {checklists.map((checklist) => {
        const progress = getChecklistProgress(checklist)
        const isEditingTitle = editingChecklistId === checklist.id
        const editingItemId = editingItemIds[checklist.id]

        return (
          <div key={checklist.id} className="border rounded-lg p-4 space-y-3">
            {/* Checklist Header */}
            <div className="flex items-center justify-between">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingChecklistTitle}
                    onChange={(e) => setEditingChecklistTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateChecklist(checklist.id)
                      } else if (e.key === 'Escape') {
                        setEditingChecklistId(null)
                        setEditingChecklistTitle('')
                      }
                    }}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUpdateChecklist(checklist.id)}
                    className="h-8"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingChecklistId(null)
                      setEditingChecklistTitle('')
                    }}
                    className="h-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <h4 className="font-medium">{checklist.title}</h4>
                  <span className="text-xs text-muted-foreground">
                    {progress.completed}/{progress.total}
                  </span>
                  {progress.total > 0 && (
                    <div className="flex-1 max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1">
                {!isEditingTitle && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingChecklistId(checklist.id)
                        setEditingChecklistTitle(checklist.title)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteChecklist(checklist.id)}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              {checklist.items.map((item) => {
                const isEditing = editingItemId === item.id
                const editingText = editingItemTexts[`${checklist.id}-${item.id}`] || item.text

                return (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => handleToggleItem(checklist.id, item.id, item.completed)}
                      className="flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors hover:border-primary"
                    >
                      {item.completed && <Check className="h-3 w-3 text-primary" />}
                    </button>
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingText}
                          onChange={(e) =>
                            setEditingItemTexts({
                              ...editingItemTexts,
                              [`${checklist.id}-${item.id}`]: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateItem(checklist.id, item.id)
                            } else if (e.key === 'Escape') {
                              setEditingItemIds({ ...editingItemIds, [checklist.id]: '' })
                            }
                          }}
                          className="flex-1 h-8"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateItem(checklist.id, item.id)}
                          className="h-8"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingItemIds({ ...editingItemIds, [checklist.id]: '' })
                          }}
                          className="h-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                          onDoubleClick={() => handleStartEditItem(checklist.id, item.id, item.text)}
                        >
                          {item.text}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditItem(checklist.id, item.id, item.text)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteItem(checklist.id, item.id)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Add Item Input */}
              <div className="flex items-center gap-2">
                <div className="w-5" /> {/* Spacer for alignment */}
                <Input
                  placeholder="Add an item"
                  value={newItemTexts[checklist.id] || ''}
                  onChange={(e) =>
                    setNewItemTexts({ ...newItemTexts, [checklist.id]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateItem(checklist.id)
                    }
                  }}
                  className="flex-1 h-8"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCreateItem(checklist.id)}
                  disabled={!newItemTexts[checklist.id]?.trim()}
                  className="h-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Add Checklist */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add a checklist"
          value={newChecklistTitle}
          onChange={(e) => setNewChecklistTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCreateChecklist()
            }
          }}
          className="flex-1 h-9"
        />
        <Button
          onClick={handleCreateChecklist}
          disabled={!newChecklistTitle.trim()}
          size="sm"
          className="h-9"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
    </div>
  )
}


