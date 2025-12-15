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
import type { GithubStatus } from '@/types/board'

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
  status: GithubStatus
  pullRequestUrl?: string
}

const STATUS_META: Record<
  GithubStatus,
  { label: string; badge: 'default' | 'secondary' | 'outline'; dot: string }
> = {
  open: { label: 'Open', badge: 'outline', dot: 'bg-green-500' },
  requested_pr: { label: 'Requested PR', badge: 'outline', dot: 'bg-amber-500' },
  merging_pr: { label: 'Merging PR', badge: 'default', dot: 'bg-blue-500' },
  merged_pr: { label: 'Merged PR', badge: 'default', dot: 'bg-purple-500' },
  merged: { label: 'Merged', badge: 'default', dot: 'bg-purple-500' },
  deploying: { label: 'Deploying', badge: 'default', dot: 'bg-indigo-500' },
  deployed: { label: 'Deployed', badge: 'default', dot: 'bg-green-600' },
  failed: { label: 'Failed', badge: 'secondary', dot: 'bg-red-500' },
  closed: { label: 'Closed', badge: 'secondary', dot: 'bg-gray-500' },
}

const STATUS_OPTIONS: Array<{ value: GithubStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'requested_pr', label: 'Requested PR' },
  { value: 'merging_pr', label: 'Merging PR' },
  { value: 'merged_pr', label: 'Merged PR' },
  { value: 'merged', label: 'Merged' },
  { value: 'deploying', label: 'Deploying' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'failed', label: 'Failed' },
  { value: 'closed', label: 'Closed' },
]

type GitHubBranchesProps = {
  branches: Branch[]
  newBranchName: string
  setNewBranchName: (name: string) => void
  onAddBranch: () => void
  onUpdateBranchStatus: (branchName: string, status: GithubStatus) => void
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

  const getStatusMeta = (status: GithubStatus) => {
    return STATUS_META[status] || STATUS_META.open
  }

  const statusMetaList = STATUS_OPTIONS.map((option) => ({
    ...option,
    meta: getStatusMeta(option.value),
  }))

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
                          variant={getStatusMeta(branch.status).badge}
                          className="text-xs flex-shrink-0"
                        >
                          {getStatusMeta(branch.status).label}
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
                              getStatusMeta(branch.status).dot
                            )}
                          />
                          <Badge
                            variant={getStatusMeta(branch.status).badge}
                            className="text-xs"
                          >
                            {getStatusMeta(branch.status).label}
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
                          {statusMetaList.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => onUpdateBranchStatus(branch.name, option.value)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <div className={cn('h-2 w-2 rounded-full', option.meta.dot)} />
                              <span>{option.label}</span>
                            </DropdownMenuItem>
                          ))}
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
