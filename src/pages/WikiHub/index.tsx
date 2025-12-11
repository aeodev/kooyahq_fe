import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, Search, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePages } from '@/hooks/wiki-hub.hooks'
import { useWorkspaces } from '@/hooks/workspace.hooks'
import { CreatePageModal } from './components/CreatePageModal'
import { Skeleton } from '@/components/ui/skeleton'

export function WikiHub() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  
  // Get workspace
  const { data: workspaces, loading: workspacesLoading } = useWorkspaces()
  const selectedWorkspace = workspaces[0]
  
  // Get pages
  const { pages, loading: pagesLoading, fetchPages } = usePages(selectedWorkspace?.id)

  useEffect(() => {
    if (selectedWorkspace?.id) {
      fetchPages()
    }
  }, [selectedWorkspace?.id, fetchPages])

  const handleCreatePage = () => {
    setCreateModalOpen(true)
  }

  const handlePageCreated = (pageId: string) => {
    fetchPages()
  }

  const loading = workspacesLoading || pagesLoading

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Wiki Hub</h1>
              <p className="text-sm text-muted-foreground">Centralized documentation hub</p>
            </div>
          </div>
          <Button onClick={handleCreatePage} disabled={!selectedWorkspace}>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !selectedWorkspace ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No workspace found</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                You need to be a member of a workspace to create pages.
              </p>
            </div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No pages yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Get started by creating your first page. Use templates for SOPs, meeting notes, project plans, and more.
              </p>
              <Button size="lg" onClick={handleCreatePage}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Page
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => navigate(`/wiki-hub/${page.id}`)}
                  className="border border-border rounded-lg p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <h3 className="font-semibold mb-2">{page.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {page.status === 'draft' && (
                      <span className="inline-block px-2 py-0.5 rounded bg-muted text-xs mr-2">
                        Draft
                      </span>
                    )}
                    {page.isPinned && (
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs mr-2">
                        Pinned
                      </span>
                    )}
                    Updated {new Date(page.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Page Modal */}
      {selectedWorkspace && (
        <CreatePageModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          workspaceId={selectedWorkspace.id}
          onCreate={handlePageCreated}
        />
      )}
    </div>
  )
}
