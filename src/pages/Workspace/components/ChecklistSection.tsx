import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Card } from '@/types/board'
import { Check, Plus, X, Trash2, Edit2 } from 'lucide-react'

// TODO: Add Checklist and ChecklistItem types to board types
type Checklist = {
  id: string
  title: string
  items: ChecklistItem[]
}

type ChecklistItem = {
  id: string
  text: string
  completed: boolean
}

type ChecklistSectionProps = {
  card: Card
  onUpdate: () => void
}

export function ChecklistSection({ card: _card, onUpdate }: ChecklistSectionProps) {
  // TODO: Implement checklist methods in board store
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('')
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({})
  const [editingItemIds, setEditingItemIds] = useState<Record<string, string>>({})
  const [editingItemTexts, setEditingItemTexts] = useState<Record<string, string>>({})

  // TODO: Add checklists property to Card type
  const checklists: Checklist[] = []

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return
    console.warn('Checklist creation feature not yet implemented')
    // await createChecklist(card.id, newChecklistTitle.trim())
    setNewChecklistTitle('')
    onUpdate()
  }

  const handleUpdateChecklist = async (_checklistId: string) => {
    if (!editingChecklistTitle.trim()) return
    console.warn('Checklist update feature not yet implemented')
    // await updateChecklist(card.id, checklistId, { title: editingChecklistTitle.trim() })
    setEditingChecklistId(null)
    setEditingChecklistTitle('')
    onUpdate()
  }

  const handleDeleteChecklist = async (_checklistId: string) => {
    if (confirm('Are you sure you want to delete this checklist?')) {
      console.warn('Checklist deletion feature not yet implemented')
      // await deleteChecklist(card.id, checklistId)
      onUpdate()
    }
  }

  const handleCreateItem = async (checklistId: string) => {
    const text = newItemTexts[checklistId]
    if (!text?.trim()) return
    console.warn('Checklist item creation feature not yet implemented')
    // await createChecklistItem(card.id, checklistId, text.trim())
    setNewItemTexts({ ...newItemTexts, [checklistId]: '' })
    onUpdate()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleToggleItem = async (_checklistId: string, _itemId: string, _completed: boolean) => {
    console.warn('Checklist item toggle feature not yet implemented')
    // await updateChecklistItem(card.id, checklistId, itemId, { completed: !completed })
    onUpdate()
  }

  const handleStartEditItem = (checklistId: string, itemId: string, text: string) => {
    setEditingItemIds({ ...editingItemIds, [checklistId]: itemId })
    setEditingItemTexts({ ...editingItemTexts, [`${checklistId}-${itemId}`]: text })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUpdateItem = async (checklistId: string, itemId: string) => {
    const text = editingItemTexts[`${checklistId}-${itemId}`]
    if (!text?.trim()) return
    console.warn('Checklist item update feature not yet implemented')
    // await updateChecklistItem(card.id, checklistId, itemId, { text: text.trim() })
    setEditingItemIds({ ...editingItemIds, [checklistId]: '' })
    setEditingItemTexts({ ...editingItemTexts, [`${checklistId}-${itemId}`]: '' })
    onUpdate()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteItem = async (_checklistId: string, _itemId: string) => {
    console.warn('Checklist item deletion feature not yet implemented')
    // await deleteChecklistItem(card.id, checklistId, itemId)
    onUpdate()
  }

  const getChecklistProgress = (checklist: Checklist) => {
    const total = checklist.items.length
    const completed = checklist.items.filter((item: ChecklistItem) => item.completed).length
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Checklists</h3>
      </div>

      {checklists.map((checklist: Checklist) => {
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
              {checklist.items.map((item: ChecklistItem) => {
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


