import { useState } from 'react'
import { GitBranch, ExternalLink, Plus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'

function PRUrlInput({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string
  onSave: (url: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue)

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim())
    } else {
      onCancel()
    }
  }

  return (
    <div className="flex gap-1">
      <Input
        placeholder="PR URL"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave()
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
        onBlur={handleSave}
        autoFocus
        className="h-7 text-xs"
      />
    </div>
  )
}

type Branch = {
  name: string
  status: 'merged' | 'open' | 'closed'
  pullRequestUrl?: string
}

type GitHubBranchesProps = {
  branches: Branch[]
  newBranchName: string
  setNewBranchName: (name: string) => void
  onAddBranch: () => void
  onUpdateBranchStatus: (branchName: string, status: 'merged' | 'open' | 'closed') => void
  onUpdatePullRequestUrl?: (branchName: string, pullRequestUrl: string) => void
}

export function GitHubBranches({
  branches,
  newBranchName,
  setNewBranchName,
  onAddBranch,
  onUpdateBranchStatus,
  onUpdatePullRequestUrl,
}: GitHubBranchesProps) {
  const [editingPRUrl, setEditingPRUrl] = useState<string | null>(null)

  const getStatusBadgeVariant = (status: 'merged' | 'open' | 'closed') => {
    switch (status) {
      case 'merged':
        return 'default'
      case 'closed':
        return 'secondary'
      case 'open':
      default:
        return 'outline'
    }
  }

  const getStatusColor = (status: 'merged' | 'open' | 'closed') => {
    switch (status) {
      case 'merged':
        return 'bg-purple-500'
      case 'closed':
        return 'bg-gray-500'
      case 'open':
      default:
        return 'bg-green-500'
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground block">Development</label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between text-left font-normal h-auto py-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {branches.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {branches.slice(0, 2).map((branch, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm truncate">{branch.name}</span>
                        <Badge
                          variant={getStatusBadgeVariant(branch.status)}
                          className="text-xs flex-shrink-0"
                        >
                          {branch.status}
                        </Badge>
                      </div>
                    ))}
                    {branches.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{branches.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No branches</span>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="start">
          <div className="p-2 space-y-2">
            {branches.length > 0 ? (
              <>
                {branches.map((branch, index) => (
                  <div key={index} className="space-y-2 pb-2 border-b last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{branch.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full flex-shrink-0',
                              getStatusColor(branch.status)
                            )}
                          />
                          <Badge
                            variant={getStatusBadgeVariant(branch.status)}
                            className="text-xs"
                          >
                            {branch.status}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            Change
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => onUpdateBranchStatus(branch.name, 'open')}
                            className="cursor-pointer"
                          >
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onUpdateBranchStatus(branch.name, 'merged')}
                            className="cursor-pointer"
                          >
                            Merged
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onUpdateBranchStatus(branch.name, 'closed')}
                            className="cursor-pointer"
                          >
                            Closed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {editingPRUrl === branch.name ? (
                      onUpdatePullRequestUrl && (
                        <PRUrlInput
                          initialValue={branch.pullRequestUrl || ''}
                          onSave={(url) => {
                            onUpdatePullRequestUrl(branch.name, url)
                            setEditingPRUrl(null)
                          }}
                          onCancel={() => setEditingPRUrl(null)}
                        />
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        {branch.pullRequestUrl && (
                          <a
                            href={branch.pullRequestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View pull request
                          </a>
                        )}
                        {onUpdatePullRequestUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingPRUrl(branch.name)
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            {branch.pullRequestUrl ? 'Edit PR' : 'Add PR'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : (
              <div className="text-xs text-muted-foreground py-2">
                No branches linked to this issue
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Branch name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddBranch()
                  }
                }}
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" onClick={onAddBranch} className="h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
