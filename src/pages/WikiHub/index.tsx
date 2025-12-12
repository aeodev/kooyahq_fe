import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus,
  Search,
  FileText,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Pin,
  Star,
  Trash2,
  Clock,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePages } from '@/hooks/wiki-hub.hooks'
import { useWorkspaces } from '@/hooks/workspace.hooks'
import { CreatePageModal } from './components/CreatePageModal'
import { PageDetail } from './components/PageDetail'
import { cn } from '@/utils/cn'
import axiosInstance from '@/utils/axios.instance'
import { PIN_PAGE, UNPIN_PAGE, FAVORITE_PAGE, UNFAVORITE_PAGE } from '@/utils/api.routes'
import { toastManager } from '@/components/ui/toast'

type FilterType = 'all' | 'pinned' | 'favorites' | 'drafts'
type SortType = 'updated' | 'created' | 'title'

// Persist sidebar state in localStorage
const SIDEBAR_COLLAPSED_KEY = 'wiki-hub-sidebar-collapsed'

export function WikiHub() {
  const { pageId } = useParams<{ pageId?: string }>()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('updated')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return stored === 'true'
  })

  const { data: workspaces, loading: workspacesLoading } = useWorkspaces()
  const selectedWorkspace = workspaces[0]
  const { pages, loading: pagesLoading, fetchPages, searchPages } = usePages(selectedWorkspace?.id)

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  useEffect(() => {
    if (selectedWorkspace?.id) {
      fetchPages()
    }
  }, [selectedWorkspace?.id, fetchPages])

  useEffect(() => {
    if (!selectedWorkspace?.id) return
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchPages(searchQuery.trim())
      } else {
        fetchPages()
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedWorkspace?.id, searchPages, fetchPages])

  const filteredAndSortedPages = useMemo(() => {
    let result = [...pages]

    if (filter === 'pinned') {
      result = result.filter((p) => p.isPinned)
    } else if (filter === 'favorites') {
      result = result.filter((p) => p.favorites.length > 0)
    } else if (filter === 'drafts') {
      result = result.filter((p) => p.status === 'draft')
    }

    result.sort((a, b) => {
      if (sort === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      } else if (sort === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        return a.title.localeCompare(b.title)
      }
    })

    return result
  }, [pages, filter, sort])

  const handleAction = async (
    pageId: string,
    action: 'pin' | 'unpin' | 'favorite' | 'unfavorite' | 'delete'
  ) => {
    try {
      if (action === 'pin') {
        await axiosInstance.post(PIN_PAGE(pageId))
        toastManager.success('Page pinned')
      } else if (action === 'unpin') {
        await axiosInstance.post(UNPIN_PAGE(pageId))
        toastManager.success('Page unpinned')
      } else if (action === 'favorite') {
        await axiosInstance.post(FAVORITE_PAGE(pageId))
        toastManager.success('Added to favorites')
      } else if (action === 'unfavorite') {
        await axiosInstance.post(UNFAVORITE_PAGE(pageId))
        toastManager.success('Removed from favorites')
      } else if (action === 'delete') {
        // TODO: Implement delete
      }
      await fetchPages()
    } catch (err: any) {
      toastManager.error(err.response?.data?.error?.message || 'Action failed')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  // Show detail view if pageId is present
  if (pageId) {
    return <PageDetail />
  }

  const loading = workspacesLoading || pagesLoading

  const filterLabels: Record<FilterType, string> = {
    all: 'All pages',
    pinned: 'Pinned',
    favorites: 'Favorites',
    drafts: 'Drafts',
  }

  const sortLabels: Record<SortType, string> = {
    updated: 'Last updated',
    created: 'Date created',
    title: 'Title',
  }

  const filterIcons: Record<FilterType, React.ReactNode> = {
    all: <FileText className="h-4 w-4" />,
    pinned: <Pin className="h-4 w-4" />,
    favorites: <Star className="h-4 w-4" />,
    drafts: <Clock className="h-4 w-4" />,
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-r bg-muted/30 flex-shrink-0 hidden lg:flex flex-col transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* Sidebar Header */}
        <div
          className={cn(
            'flex items-center border-b transition-all duration-300',
            sidebarCollapsed ? 'justify-center p-3' : 'justify-between p-4'
          )}
        >
          <h2
            className={cn(
              'text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-all duration-300 overflow-hidden whitespace-nowrap',
              sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
            )}
          >
            Wiki Hub
          </h2>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 p-2 space-y-1', sidebarCollapsed && 'px-2')}>
          {(['all', 'pinned', 'favorites', 'drafts'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              title={sidebarCollapsed ? filterLabels[f] : undefined}
              className={cn(
                'w-full flex items-center rounded-md transition-all duration-200',
                sidebarCollapsed ? 'justify-center p-2.5 gap-0' : 'px-2.5 py-2 gap-2.5 text-left',
                filter === f
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <span className="flex-shrink-0 flex items-center justify-center">{filterIcons[f]}</span>
              {!sidebarCollapsed && (
                <span className="text-sm whitespace-nowrap">{filterLabels[f]}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer - Quick Create */}
        <div
          className={cn(
            'border-t p-2 transition-all duration-300',
            sidebarCollapsed && 'px-2'
          )}
        >
          <button
            onClick={() => setCreateModalOpen(true)}
            disabled={!selectedWorkspace}
            title={sidebarCollapsed ? 'Create page' : undefined}
            className={cn(
              'w-full flex items-center rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-50 disabled:pointer-events-none',
              sidebarCollapsed ? 'justify-center p-2.5 gap-0' : 'px-2.5 py-2 gap-2.5 text-left'
            )}
          >
            <Plus className="h-4 w-4 flex-shrink-0 flex items-center justify-center" />
            {!sidebarCollapsed && <span className="text-sm whitespace-nowrap">New page</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{filterLabels[filter]}</h1>
              {!loading && (
                <p className="text-sm text-muted-foreground">
                  {filteredAndSortedPages.length} page
                  {filteredAndSortedPages.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <Button
              onClick={() => setCreateModalOpen(true)}
              disabled={!selectedWorkspace}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create
            </Button>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>

            {/* Mobile filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="lg:hidden">
                <Button variant="outline" size="sm">
                  {filterLabels[filter]}
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(['all', 'pinned', 'favorites', 'drafts'] as FilterType[]).map((f) => (
                  <DropdownMenuItem key={f} onClick={() => setFilter(f)}>
                    {filterLabels[f]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  {sortLabels[sort]}
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(['updated', 'created', 'title'] as SortType[]).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setSort(s)}>
                    {sortLabels[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : !selectedWorkspace ? (
            <EmptyState
              title="No workspace"
              description="You need to be a member of a workspace to access pages."
            />
          ) : filteredAndSortedPages.length === 0 ? (
            <EmptyState
              title={filter === 'all' ? 'No pages yet' : `No ${filterLabels[filter].toLowerCase()}`}
              description={
                filter === 'all'
                  ? 'Create your first page to get started.'
                  : `You don't have any ${filterLabels[filter].toLowerCase()} pages.`
              }
              action={
                filter === 'all' ? (
                  <Button onClick={() => setCreateModalOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create page
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="divide-y">
              {filteredAndSortedPages.map((page) => {
                const isFavorited = page.favorites.length > 0
                return (
                  <div
                    key={page.id}
                    className="group px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-3"
                    onClick={() => navigate(`/wiki-hub/${page.id}`)}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{page.title}</span>
                        {page.status === 'draft' && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Draft
                          </span>
                        )}
                        {page.isPinned && (
                          <Pin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        {isFavorited && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Updated {formatDate(page.updatedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleAction(page.id, page.isPinned ? 'unpin' : 'pin')}
                          >
                            <Pin className="h-4 w-4 mr-2" />
                            {page.isPinned ? 'Unpin' : 'Pin to top'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleAction(page.id, isFavorited ? 'unfavorite' : 'favorite')
                            }
                          >
                            <Star className="h-4 w-4 mr-2" />
                            {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleAction(page.id, 'delete')}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Page Modal */}
      {selectedWorkspace && (
        <CreatePageModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          workspaceId={selectedWorkspace.id}
          onCreate={() => fetchPages()}
        />
      )}
    </div>
  )
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action}
    </div>
  )
}
