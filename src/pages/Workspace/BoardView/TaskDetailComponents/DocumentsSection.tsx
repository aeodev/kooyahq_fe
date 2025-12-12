import { useState, useEffect } from 'react'
import { ChevronRight, FileText, FileSpreadsheet, Presentation, Figma, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'
import axiosInstance from '@/utils/axios.instance'
import { UPDATE_TICKET } from '@/utils/api.routes'
import type { TicketDetailResponse } from './types'
import { toast } from 'sonner'
import type { Ticket } from '@/types/board'

type DocumentItem = Ticket['documents'][number] & {
  name?: string
  type?: 'doc' | 'sheet' | 'slide' | 'figma' | 'other'
}

type DocumentsSectionProps = {
  ticketDetails: TicketDetailResponse | null
  documentsExpanded: boolean
  onToggleDocuments: () => void
  canUpdate: boolean
}

const getDocumentIcon = (type: 'doc' | 'sheet' | 'slide' | 'figma' | 'other') => {
  switch (type) {
    case 'doc':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'sheet':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />
    case 'slide':
      return <Presentation className="h-4 w-4 text-orange-500" />
    case 'figma':
      return <Figma className="h-4 w-4 text-purple-500" />
    case 'other':
      return <Link2 className="h-4 w-4 text-muted-foreground" />
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

export function DocumentsSection({
  ticketDetails,
  documentsExpanded,
  onToggleDocuments,
  canUpdate,
}: DocumentsSectionProps) {
  const [newDocumentName, setNewDocumentName] = useState('')
  const [newDocumentUrl, setNewDocumentUrl] = useState('')
  const [newDocumentType, setNewDocumentType] = useState<'doc' | 'sheet' | 'slide' | 'figma' | 'other'>('doc')
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [removingIndex, setRemovingIndex] = useState<number | null>(null)
  const [localDocuments, setLocalDocuments] = useState<DocumentItem[]>(
    (ticketDetails?.ticket.documents as DocumentItem[] | undefined) || []
  )

  // Sync local documents when ticketDetails changes
  useEffect(() => {
    if (ticketDetails?.ticket.documents) {
      setLocalDocuments(ticketDetails.ticket.documents as DocumentItem[])
    }
  }, [ticketDetails?.ticket.documents])

  const documents = localDocuments

  const handleAddDocument = async () => {
    if (!newDocumentName.trim() || !newDocumentUrl.trim() || !ticketDetails?.ticket.id || loading || !canUpdate) return

    const newDocument: DocumentItem = {
      name: newDocumentName.trim(),
      label: newDocumentName.trim(),
      url: newDocumentUrl.trim(),
      type: newDocumentType,
    }

    // Optimistically update UI
    const updatedDocuments = [...documents, newDocument]
    setLocalDocuments(updatedDocuments)
    const documentName = newDocumentName.trim()
    const documentUrl = newDocumentUrl.trim()
    const documentType = newDocumentType
    setNewDocumentName('')
    setNewDocumentUrl('')
    setNewDocumentType('doc')
    setIsAdding(false)
    setLoading(true)

    try {
      const response = await axiosInstance.put<{ success: boolean }>(UPDATE_TICKET(ticketDetails.ticket.id), {
        data: { documents: updatedDocuments },
      })
      if (!response.data.success) {
        // Revert on error
        setLocalDocuments(documents)
        setNewDocumentName(documentName)
        setNewDocumentUrl(documentUrl)
        setNewDocumentType(documentType)
        setIsAdding(true)
        toast.error('Failed to add document')
      }
    } catch (error) {
      // Revert on error
      setLocalDocuments(documents)
      setNewDocumentName(documentName)
      setNewDocumentUrl(documentUrl)
      setNewDocumentType(documentType)
      setIsAdding(true)
      toast.error('Failed to add document')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDocument = async (index: number) => {
    if (!ticketDetails?.ticket.id || removingIndex !== null || !canUpdate) return

    // Optimistically update UI
    const oldDocuments = [...documents]
    const updatedDocuments = documents.filter((_, i) => i !== index)
    setLocalDocuments(updatedDocuments)
    setRemovingIndex(index)

    try {
      const response = await axiosInstance.put<{ success: boolean }>(UPDATE_TICKET(ticketDetails.ticket.id), {
        data: { documents: updatedDocuments },
      })
      if (!response.data.success) {
        // Revert on error
        setLocalDocuments(oldDocuments)
        toast.error('Failed to remove document')
      }
    } catch (error) {
      // Revert on error
      setLocalDocuments(oldDocuments)
      toast.error('Failed to remove document')
    } finally {
      setRemovingIndex(null)
    }
  }

  return (
    <div>
      <button
        onClick={onToggleDocuments}
        className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform',
            documentsExpanded && 'rotate-90'
          )}
        />
        Documents
      </button>
      {documentsExpanded && (
        <div className="ml-6 space-y-2">
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg group">
                  <div className="flex-shrink-0">
                    {getDocumentIcon((doc.type as any) || 'other')}
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:text-primary flex-1 truncate"
                    title={doc.url}
                  >
                    {doc.name || doc.label || doc.url}
                  </a>
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDocument(index)}
                      disabled={removingIndex === index}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {removingIndex === index ? '...' : '×'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {canUpdate && isAdding ? (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Input
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="Document title..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddDocument()
                  } else if (e.key === 'Escape') {
                    setIsAdding(false)
                    setNewDocumentName('')
                    setNewDocumentUrl('')
                    setNewDocumentType('doc')
                  }
                }}
                autoFocus
              />
              <Input
                value={newDocumentUrl}
                onChange={(e) => setNewDocumentUrl(e.target.value)}
                placeholder="Link (URL)..."
                className="w-32"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddDocument()
                  } else if (e.key === 'Escape') {
                    setIsAdding(false)
                    setNewDocumentName('')
                    setNewDocumentUrl('')
                    setNewDocumentType('doc')
                  }
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 w-9 p-0 flex-shrink-0">
                    {getDocumentIcon(newDocumentType)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setNewDocumentType('doc')} className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setNewDocumentType('sheet')} className="cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Spreadsheet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setNewDocumentType('slide')} className="cursor-pointer">
                    <Presentation className="h-4 w-4 mr-2" />
                    Presentation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setNewDocumentType('figma')} className="cursor-pointer">
                    <Figma className="h-4 w-4 mr-2" />
                    Figma
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setNewDocumentType('other')} className="cursor-pointer">
                    <Link2 className="h-4 w-4 mr-2" />
                    Other
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={handleAddDocument} disabled={loading}>
                {loading ? 'Adding...' : 'Add'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false)
                  setNewDocumentName('')
                  setNewDocumentUrl('')
                  setNewDocumentType('doc')
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add document
            </button>
          )}
        </div>
      )}
    </div>
  )
}
