import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AnsiToHtml from 'ansi-to-html'
import { Activity, AlertTriangle, ChevronLeft, Pencil, Play, Plus, Trash2, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import axiosInstance from '@/utils/axios.instance'
import {
  CREATE_SERVER_MANAGEMENT_PROJECT,
  CREATE_SERVER_MANAGEMENT_SERVER,
  DELETE_SERVER_MANAGEMENT_PROJECT,
  DELETE_SERVER_MANAGEMENT_SERVER,
  GET_SERVER_MANAGEMENT_PROJECTS,
  GET_SERVER_STATUS,
  RUN_SERVER_MANAGEMENT_ACTION,
  SocketServerManagementEvents,
  UPDATE_SERVER_MANAGEMENT_PROJECT,
  UPDATE_SERVER_MANAGEMENT_SERVER,
} from '@/utils/api.routes'
import { cn } from '@/utils/cn'
import type { Action, Project, Server } from './types'

type ProjectFormState = {
  emoji: string
  name: string
  description: string
}

type ProjectFormErrors = Partial<Record<keyof ProjectFormState, string>>

type ActionErrors = {
  name?: string
  description?: string
  command?: string
}

type ServerFormErrors = {
  name?: string
  summary?: string
  host?: string
  actions?: Record<string, ActionErrors>
}

type ServerFormState = {
  name: string
  summary: string
  host: string
  port: string
  user: string
  sshKey: string
  statusCommand: string
  appDirectory: string
  actions: Action[]
}

type RunOutputStatus = 'running' | 'success' | 'failure' | 'error'

type CliOutput = {
  runId: string
  actionName: string
  serverName: string
  host?: string
  command?: string
  status: RunOutputStatus
  lines: string[]
}

type RunStartedPayload = {
  runId: string
  serverId: string
  actionId: string
  actionName?: string
  host?: string
  startedAt?: string
}

type RunOutputPayload = {
  runId: string
  serverId: string
  actionId: string
  stream?: 'stdout' | 'stderr'
  chunk?: string
}

type RunCompletedPayload = {
  runId: string
  serverId: string
  actionId: string
  exitCode?: number | null
  signal?: string | null
  success?: boolean
  completedAt?: string
}

type RunErrorPayload = {
  runId: string
  serverId: string
  actionId: string
  message?: string
}

type StatusUsage = {
  usage_bytes?: number
  limit_bytes?: number
  percent?: number
  raw?: string
}

type StatusTransfer = {
  rx_bytes?: number
  tx_bytes?: number
  raw?: string
}

type StatusBlock = {
  read_bytes?: number
  write_bytes?: number
  raw?: string
}

type DockerContainerStatus = {
  container_id?: string
  name?: string
  cpu_percent?: number
  cpu_raw?: string
  mem?: StatusUsage
  net?: StatusTransfer
  block?: StatusBlock
  pids?: number
  state?: string
  status?: string
  health?: string
  image?: string
  ports?: string
}

type StatusPayload = {
  timestamp?: string
  instance?: {
    hostname?: string
    mem?: {
      total_bytes?: number
      used_bytes?: number
      available_bytes?: number
    }
    cpu?: {
      loadavg_1m?: number
      loadavg_5m?: number
      loadavg_15m?: number
    }
    network?: Record<string, StatusTransfer>
    storage_root?: {
      total_bytes?: number
      used_bytes?: number
      available_bytes?: number
    }
  }
  docker?: {
    compose_ps_error?: string | null
    containers?: Record<string, DockerContainerStatus>
  }
}

const emptyProjectForm: ProjectFormState = {
  emoji: '',
  name: '',
  description: '',
}

const emptyServerForm: ServerFormState = {
  name: '',
  summary: '',
  host: '',
  port: '',
  user: '',
  sshKey: '',
  statusCommand: '',
  appDirectory: '',
  actions: [],
}

const EMOJI_CATEGORIES = {
  Popular: ['🚀', '⭐', '🎯', '💡', '🔥', '✨', '💎', '🏆'],
  Work: ['📋', '📊', '📈', '💼', '🗂️', '📁', '📝', '✅'],
  Tech: ['💻', '🖥️', '📱', '⚙️', '🔧', '🛠️', '🔌', '💾'],
  Design: ['🎨', '🖌️', '✏️', '📐', '🎭', '🌈', '🎬', '📷'],
  Communication: ['💬', '📢', '📣', '📧', '📩', '🔔', '📞', '🗣️'],
  Nature: ['🌱', '🌿', '🌸', '🌻', '🍀', '🌲', '🌊', '⛰️'],
  Objects: ['🎁', '🎪', '🎮', '🎲', '🧩', '🔮', '💰', '🔑'],
  Symbols: ['❤️', '💜', '💙', '💚', '🧡', '⚡', '🌟', '💫'],
}
const EMOJI_PICKER_WIDTH = 320
const EMOJI_PICKER_MAX_HEIGHT = 360
const EMOJI_PICKER_PADDING = 12

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const createAction = (): Action => ({
  id: createId('action'),
  name: '',
  description: '',
  command: '',
  dangerous: false,
})

const formatBytes = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let size = Math.abs(value)
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const decimals = size >= 10 || unitIndex === 0 ? 0 : 1
  const sign = value < 0 ? '-' : ''
  return `${sign}${size.toFixed(decimals)} ${units[unitIndex]}`
}

const formatPercent = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}%`
}

const formatLoadAvg = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return value.toFixed(2)
}

const formatUsage = (used?: number, total?: number) => {
  if (typeof used !== 'number' || typeof total !== 'number' || !Number.isFinite(used) || !Number.isFinite(total)) {
    return '—'
  }
  const percent = total > 0 ? (used / total) * 100 : 0
  return `${formatBytes(used)} / ${formatBytes(total)} (${percent.toFixed(1)}%)`
}

const formatContainerMem = (mem?: StatusUsage) => {
  if (!mem) return '—'
  if (mem.raw) return mem.raw
  if (typeof mem.usage_bytes === 'number' && typeof mem.limit_bytes === 'number') {
    const percent = typeof mem.percent === 'number' ? mem.percent : (mem.usage_bytes / mem.limit_bytes) * 100
    return `${formatBytes(mem.usage_bytes)} / ${formatBytes(mem.limit_bytes)} (${percent.toFixed(1)}%)`
  }
  return '—'
}

const formatContainerTransfer = (net?: StatusTransfer) => {
  if (!net) return '—'
  if (net.raw) return net.raw
  return `${formatBytes(net.rx_bytes)} / ${formatBytes(net.tx_bytes)}`
}

const formatContainerBlock = (block?: StatusBlock) => {
  if (!block) return '—'
  if (block.raw) return block.raw
  return `${formatBytes(block.read_bytes)} / ${formatBytes(block.write_bytes)}`
}

const formatContainerCpu = (container: DockerContainerStatus) => {
  if (container.cpu_raw) return container.cpu_raw
  if (typeof container.cpu_percent === 'number') return formatPercent(container.cpu_percent)
  return '—'
}

const clampPercent = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, value))
}

const getUsagePercent = (used?: number, total?: number) => {
  if (typeof used !== 'number' || typeof total !== 'number' || !Number.isFinite(used) || !Number.isFinite(total)) {
    return null
  }
  if (total <= 0) return null
  return clampPercent((used / total) * 100)
}

const getContainerMemPercent = (mem?: StatusUsage) => {
  if (!mem) return null
  if (typeof mem.percent === 'number') return clampPercent(mem.percent)
  return getUsagePercent(mem.usage_bytes, mem.limit_bytes)
}

const renderPercentBar = (percent: number | null, toneClass: string) => {
  if (percent === null) return null
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-muted/60">
      <div className={cn('h-full rounded-full transition-all', toneClass)} style={{ width: `${percent}%` }} />
    </div>
  )
}

const formatStatusValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isStatusInstance = (
  value: StatusPayload['instance'] | undefined
): value is NonNullable<StatusPayload['instance']> => isPlainObject(value)

const isStatusDocker = (
  value: StatusPayload['docker'] | undefined
): value is NonNullable<StatusPayload['docker']> => isPlainObject(value)

type NetworkGroup = {
  label: string
  description?: string
  entries: Array<{ name: string; stats: StatusTransfer }>
  totalRx: number
  totalTx: number
}

const groupNetworkInterfaces = (network?: Record<string, StatusTransfer>): NetworkGroup[] => {
  if (!network) return []
  const groups = new Map<string, NetworkGroup>()

  const register = (label: string, description?: string) => {
    if (!groups.has(label)) {
      groups.set(label, {
        label,
        description,
        entries: [],
        totalRx: 0,
        totalTx: 0,
      })
    }
    return groups.get(label)!
  }

  const rules = [
    {
      label: 'Primary',
      description: 'Physical or bonded interfaces',
      match: (name: string) =>
        name.startsWith('ens') ||
        name.startsWith('eth') ||
        name.startsWith('enp') ||
        name.startsWith('eno') ||
        name.startsWith('bond') ||
        name.startsWith('wlan') ||
        name.startsWith('wl'),
    },
    {
      label: 'Docker / Bridge',
      description: 'Container bridges and docker networks',
      match: (name: string) => name === 'docker0' || name.startsWith('br-') || name.startsWith('docker'),
    },
    {
      label: 'Container veth',
      description: 'Virtual ethernet pairs created per container',
      match: (name: string) => name.startsWith('veth'),
    },
    {
      label: 'Tunnel / VPN',
      description: 'Tunnel interfaces (VPN, WireGuard, etc.)',
      match: (name: string) => name.startsWith('tun') || name.startsWith('tap') || name.startsWith('wg'),
    },
    {
      label: 'Loopback',
      description: 'Local host traffic only',
      match: (name: string) => name === 'lo',
    },
  ]

  Object.entries(network).forEach(([name, stats]) => {
    const rule = rules.find((entry) => entry.match(name))
    const group = rule ? register(rule.label, rule.description) : register('Other', 'Unclassified interfaces')
    group.entries.push({ name, stats })
    group.totalRx += typeof stats?.rx_bytes === 'number' ? stats.rx_bytes : 0
    group.totalTx += typeof stats?.tx_bytes === 'number' ? stats.tx_bytes : 0
  })

  const orderedLabels = [...rules.map((rule) => rule.label), 'Other']
  return orderedLabels
    .map((label) => groups.get(label))
    .filter((group): group is NetworkGroup => Boolean(group))
}

const cardClassName = 'rounded-2xl border border-border/60 bg-background/90 p-5 shadow-sm'

const fieldErrorClass = 'border-destructive/60 focus-visible:ring-destructive'

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseMessage =
    (error as { response?: { data?: { message?: string | string[]; error?: { message?: string | string[] } } } })
      ?.response?.data?.message ??
    (error as { response?: { data?: { message?: string | string[]; error?: { message?: string | string[] } } } })
      ?.response?.data?.error?.message

  if (Array.isArray(responseMessage)) {
    return responseMessage.join(', ')
  }
  if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
    return responseMessage
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export function ServerManagement() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit'>('create')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm)
  const [projectFormErrors, setProjectFormErrors] = useState<ProjectFormErrors>({})
  const [projectFormError, setProjectFormError] = useState<string | null>(null)
  const [projectSaving, setProjectSaving] = useState(false)
  const [projectEmojiPickerOpen, setProjectEmojiPickerOpen] = useState(false)
  const [projectEmojiPickerPosition, setProjectEmojiPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const projectEmojiButtonRef = useRef<HTMLButtonElement>(null)

  const [serverModalOpen, setServerModalOpen] = useState(false)
  const [serverModalMode, setServerModalMode] = useState<'create' | 'edit'>('create')
  const [editingServerId, setEditingServerId] = useState<string | null>(null)
  const [serverForm, setServerForm] = useState<ServerFormState>(emptyServerForm)
  const [serverFormErrors, setServerFormErrors] = useState<ServerFormErrors>({})
  const [serverFormError, setServerFormError] = useState<string | null>(null)
  const [serverSaving, setServerSaving] = useState(false)

  const [pendingRemoval, setPendingRemoval] = useState<{
    type: 'project' | 'server'
    projectId: string
    serverId?: string
    name: string
  } | null>(null)
  const [removalError, setRemovalError] = useState<string | null>(null)
  const [removalLoading, setRemovalLoading] = useState(false)

  const [pendingAction, setPendingAction] = useState<{ action: Action; server: Server } | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [actionRunError, setActionRunError] = useState<string | null>(null)
  const [actionRunPendingId, setActionRunPendingId] = useState<string | null>(null)
  const [cliOutput, setCliOutput] = useState<CliOutput | null>(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusRefreshing, setStatusRefreshing] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusData, setStatusData] = useState<Record<string, string>>({})
  const [statusServerId, setStatusServerId] = useState<string | null>(null)
  const [statusServerName, setStatusServerName] = useState('')
  const [statusPayload, setStatusPayload] = useState<StatusPayload | null>(null)
  const cliOutputRef = useRef<HTMLPreElement | null>(null)
  const cliAutoScrollRef = useRef(true)
  const statusPollInFlightRef = useRef(false)
  const ansiConverter = useMemo(
    () =>
      new AnsiToHtml({
        escapeXML: true,
        newline: false,
      }),
    []
  )
  const cliOutputHtml = useMemo(() => {
    if (!cliOutput) return ''
    return ansiConverter.toHtml(cliOutput.lines.join('\n'))
  }, [ansiConverter, cliOutput])

  const navigate = useNavigate()
  const { projectId: routeProjectId, serverId: routeServerId } = useParams<{
    projectId?: string
    serverId?: string
  }>()
  const selectedProjectId = routeProjectId ?? null
  const selectedServerId = routeServerId ?? null

  const can = useAuthStore((state) => state.can)
  const canManage = can(PERMISSIONS.SERVER_MANAGEMENT_MANAGE)
  const canElevatedUse = canManage || can(PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE)
  const canUse = canElevatedUse || can(PERMISSIONS.SERVER_MANAGEMENT_USE)

  const socket = useSocketStore((state) => state.socket)
  const socketConnected = useSocketStore((state) => state.connected)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  const selectedServer = useMemo(() => {
    if (!selectedProject) return null
    return selectedProject.servers.find((server) => server.id === selectedServerId) ?? null
  }, [selectedProject, selectedServerId])

  const totalServers = useMemo(
    () => projects.reduce((total, project) => total + project.servers.length, 0),
    [projects]
  )
  const instanceStatus = isStatusInstance(statusPayload?.instance) ? statusPayload?.instance : undefined
  const dockerStatus = isStatusDocker(statusPayload?.docker) ? statusPayload?.docker : undefined
  const statusHasStructured = Boolean(instanceStatus || dockerStatus)
  const networkGroups = useMemo(
    () => groupNetworkInterfaces(instanceStatus?.network),
    [instanceStatus?.network]
  )
  const containerEntries = Object.entries(dockerStatus?.containers ?? {})

  useEffect(() => {
    if (!routeProjectId) return
    if (projectsLoading || projectsError) return
    const exists = projects.some((project) => project.id === routeProjectId)
    if (!exists) {
      navigate('/server-management', { replace: true })
    }
  }, [routeProjectId, projects, projectsLoading, projectsError, navigate])

  useEffect(() => {
    if (!routeProjectId || !routeServerId) return
    if (projectsLoading || projectsError) return
    const project = projects.find((item) => item.id === routeProjectId)
    if (!project) return
    const serverExists = project.servers.some((server) => server.id === routeServerId)
    if (!serverExists) {
      navigate(`/server-management/projects/${project.id}`, { replace: true })
    }
  }, [routeProjectId, routeServerId, projects, projectsLoading, projectsError, navigate])

  const updateCliOutput = useCallback((runId: string, updater: (current: CliOutput) => CliOutput) => {
    setCliOutput((current) => {
      if (!current || current.runId !== runId) return current
      return updater(current)
    })
  }, [])

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true)
    setProjectsError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: Project[] }>(
        GET_SERVER_MANAGEMENT_PROJECTS()
      )
      setProjects(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error) {
      setProjectsError(getErrorMessage(error, 'Unable to load projects'))
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (!socket) return

    const handleRunStarted = (payload: RunStartedPayload) => {
      if (!payload?.runId) return

      updateCliOutput(payload.runId, (current) => ({
        ...current,
        status: 'running',
        actionName: payload.actionName ?? current.actionName,
        host: payload.host ?? current.host,
        lines: [
          ...current.lines,
          `[${payload.startedAt ?? new Date().toISOString()}] Run started`,
        ],
      }))
    }

    const handleRunOutput = (payload: RunOutputPayload) => {
      if (!payload?.runId || !payload.chunk) return

      const prefix = payload.stream === 'stderr' ? '[stderr] ' : ''
      const lines = payload.chunk
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
        .map((line) => `${prefix}${line}`)

      if (lines.length === 0) return

      updateCliOutput(payload.runId, (current) => ({
        ...current,
        lines: [...current.lines, ...lines],
      }))
    }

    const handleRunCompleted = (payload: RunCompletedPayload) => {
      if (!payload?.runId) return

      updateCliOutput(payload.runId, (current) => {
        const exitCode =
          payload.exitCode === null || payload.exitCode === undefined ? 'unknown' : String(payload.exitCode)
        const nextLines = [...current.lines, `Exit code: ${exitCode}`]
        if (payload.signal) {
          nextLines.push(`Signal: ${payload.signal}`)
        }
        if (payload.completedAt) {
          nextLines.push(`[${payload.completedAt}] Run completed`)
        }
        return {
          ...current,
          status: payload.success ? 'success' : 'failure',
          lines: nextLines,
        }
      })

      if (socketConnected) {
        socket.emit('server-management:leave-run', payload.runId)
      }
    }

    const handleRunError = (payload: RunErrorPayload) => {
      if (!payload?.runId) return

      updateCliOutput(payload.runId, (current) => ({
        ...current,
        status: 'error',
        lines: [...current.lines, `Error: ${payload.message || 'Unknown error'}`],
      }))

      if (socketConnected) {
        socket.emit('server-management:leave-run', payload.runId)
      }
    }

    socket.on(SocketServerManagementEvents.RUN_STARTED, handleRunStarted)
    socket.on(SocketServerManagementEvents.RUN_OUTPUT, handleRunOutput)
    socket.on(SocketServerManagementEvents.RUN_COMPLETED, handleRunCompleted)
    socket.on(SocketServerManagementEvents.RUN_ERROR, handleRunError)

    return () => {
      socket.off(SocketServerManagementEvents.RUN_STARTED, handleRunStarted)
      socket.off(SocketServerManagementEvents.RUN_OUTPUT, handleRunOutput)
      socket.off(SocketServerManagementEvents.RUN_COMPLETED, handleRunCompleted)
      socket.off(SocketServerManagementEvents.RUN_ERROR, handleRunError)
    }
  }, [socket, socketConnected, updateCliOutput])

  useEffect(() => {
    if (!socket || !socketConnected) return
    if (!cliOutput?.runId) return

    socket.emit('server-management:join-run', cliOutput.runId)
    return () => {
      socket.emit('server-management:leave-run', cliOutput.runId)
    }
  }, [socket, socketConnected, cliOutput?.runId])

  useEffect(() => {
    if (!cliOutput?.runId) return
    cliAutoScrollRef.current = true
    const output = cliOutputRef.current
    if (output) {
      output.scrollTop = output.scrollHeight
    }
  }, [cliOutput?.runId])

  useEffect(() => {
    if (!cliAutoScrollRef.current) return
    const output = cliOutputRef.current
    if (output) {
      output.scrollTop = output.scrollHeight
    }
  }, [cliOutput?.lines.length])

  const openCreateProject = () => {
    if (!canManage) return
    setProjectModalMode('create')
    setEditingProjectId(null)
    setProjectForm(emptyProjectForm)
    setProjectFormErrors({})
    setProjectFormError(null)
    setProjectEmojiPickerOpen(false)
    setProjectModalOpen(true)
  }

  const openEditProject = (project: Project) => {
    if (!canManage) return
    setProjectModalMode('edit')
    setEditingProjectId(project.id)
    setProjectForm({
      emoji: project.emoji,
      name: project.name,
      description: project.description,
    })
    setProjectFormErrors({})
    setProjectFormError(null)
    setProjectEmojiPickerOpen(false)
    setProjectModalOpen(true)
  }

  const closeProjectModal = () => {
    setProjectEmojiPickerOpen(false)
    setProjectModalOpen(false)
  }

  const updateProjectEmojiPickerPosition = useCallback(() => {
    const button = projectEmojiButtonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const openBelow = rect.bottom + 8 + EMOJI_PICKER_MAX_HEIGHT <= window.innerHeight - EMOJI_PICKER_PADDING
    const top = openBelow
      ? rect.bottom + 8
      : Math.max(EMOJI_PICKER_PADDING, rect.top - EMOJI_PICKER_MAX_HEIGHT - 8)
    const left = Math.min(
      Math.max(rect.left, EMOJI_PICKER_PADDING),
      window.innerWidth - EMOJI_PICKER_WIDTH - EMOJI_PICKER_PADDING
    )
    setProjectEmojiPickerPosition({ top, left })
  }, [])

  useEffect(() => {
    if (!projectEmojiPickerOpen) {
      setProjectEmojiPickerPosition(null)
      return
    }
    updateProjectEmojiPickerPosition()
    window.addEventListener('resize', updateProjectEmojiPickerPosition)
    return () => {
      window.removeEventListener('resize', updateProjectEmojiPickerPosition)
    }
  }, [projectEmojiPickerOpen, updateProjectEmojiPickerPosition])

  const handleSaveProject = async () => {
    if (!canManage || projectSaving) return
    const trimmed = {
      emoji: projectForm.emoji.trim(),
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
    }

    const errors: ProjectFormErrors = {
      emoji: trimmed.emoji ? undefined : 'Required',
      name: trimmed.name ? undefined : 'Required',
      description: trimmed.description ? undefined : 'Required',
    }

    if (Object.values(errors).some(Boolean)) {
      setProjectFormErrors(errors)
      setProjectFormError(null)
      return
    }

    setProjectFormErrors({})
    setProjectFormError(null)
    setProjectSaving(true)

    try {
      if (projectModalMode === 'create') {
        const response = await axiosInstance.post<{ status: string; data: Project }>(
          CREATE_SERVER_MANAGEMENT_PROJECT(),
          trimmed
        )
        const createdProject = response.data.data
        setProjects((prev) => [...prev, createdProject])
      } else if (editingProjectId) {
        const response = await axiosInstance.patch<{ status: string; data: Project }>(
          UPDATE_SERVER_MANAGEMENT_PROJECT(editingProjectId),
          trimmed
        )
        const updatedProject = response.data.data
        setProjects((prev) =>
          prev.map((project) => (project.id === editingProjectId ? updatedProject : project))
        )
      }

      closeProjectModal()
    } catch (error) {
      setProjectFormError(getErrorMessage(error, 'Unable to save project'))
    } finally {
      setProjectSaving(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    await axiosInstance.delete(DELETE_SERVER_MANAGEMENT_PROJECT(projectId))
    setProjects((prev) => prev.filter((project) => project.id !== projectId))
    if (routeProjectId === projectId) {
      navigate('/server-management')
    }
  }

  const openCreateServer = () => {
    if (!selectedProject || !canManage) return
    setServerModalMode('create')
    setEditingServerId(null)
    setServerForm({ ...emptyServerForm, actions: [createAction()] })
    setServerFormErrors({})
    setServerFormError(null)
    setServerModalOpen(true)
  }

  const openEditServer = (server: Server) => {
    if (!canManage) return
    setServerModalMode('edit')
    setEditingServerId(server.id)
    setServerForm({
      name: server.name,
      summary: server.summary,
      host: server.host,
      port: server.port ?? '',
      user: server.user ?? '',
      sshKey: '',
      statusCommand: server.statusCommand ?? '',
      appDirectory: server.appDirectory ?? '',
      actions: server.actions.map((action) => ({
        ...action,
        dangerous: action.dangerous ?? false,
      })),
    })
    setServerFormErrors({})
    setServerFormError(null)
    setServerModalOpen(true)
  }

  const updateServerAction = (actionId: string, updates: Partial<Action>) => {
    setServerForm((prev) => ({
      ...prev,
      actions: prev.actions.map((action) =>
        action.id === actionId ? { ...action, ...updates } : action
      ),
    }))
  }

  const removeServerAction = (actionId: string) => {
    setServerForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((action) => action.id !== actionId),
    }))
  }

  const handleSaveServer = async () => {
    if (!selectedProject || !canManage || serverSaving) return

    const trimmed = {
      name: serverForm.name.trim(),
      summary: serverForm.summary.trim(),
      host: serverForm.host.trim(),
      port: serverForm.port.trim(),
      user: serverForm.user.trim(),
      sshKey: serverForm.sshKey.trim(),
      statusCommand: serverForm.statusCommand.trim(),
      appDirectory: serverForm.appDirectory.trim(),
    }

    const errors: ServerFormErrors = {
      name: trimmed.name ? undefined : 'Required',
      summary: trimmed.summary ? undefined : 'Required',
      host: trimmed.host ? undefined : 'Required',
    }

    const actionErrors: Record<string, ActionErrors> = {}
    serverForm.actions.forEach((action) => {
      const actionTrimmed = {
        name: action.name.trim(),
        description: action.description.trim(),
        command: action.command.trim(),
      }

      const currentErrors: ActionErrors = {
        name: actionTrimmed.name ? undefined : 'Required',
        description: actionTrimmed.description ? undefined : 'Required',
        command: actionTrimmed.command ? undefined : 'Required',
      }

      if (Object.values(currentErrors).some(Boolean)) {
        actionErrors[action.id] = currentErrors
      }
    })

    if (Object.keys(actionErrors).length > 0) {
      errors.actions = actionErrors
    }

    if (errors.name || errors.summary || errors.host || errors.actions) {
      setServerFormErrors(errors)
      setServerFormError(null)
      return
    }

    setServerFormErrors({})
    setServerFormError(null)
    setServerSaving(true)

    const cleanedActions = serverForm.actions.map((action) => ({
      ...action,
      name: action.name.trim(),
      description: action.description.trim(),
      command: action.command.trim(),
      dangerous: action.dangerous ?? false,
    }))

    const payload = {
      name: trimmed.name,
      summary: trimmed.summary,
      host: trimmed.host,
      port: trimmed.port || undefined,
      user: trimmed.user || undefined,
      statusCommand: trimmed.statusCommand || undefined,
      appDirectory: trimmed.appDirectory || undefined,
      actions: cleanedActions,
      ...(trimmed.sshKey ? { sshKey: trimmed.sshKey } : {}),
    }

    try {
      if (serverModalMode === 'create') {
        const response = await axiosInstance.post<{ status: string; data: Server }>(
          CREATE_SERVER_MANAGEMENT_SERVER(selectedProject.id),
          payload
        )
        const createdServer = response.data.data
        setProjects((prev) =>
          prev.map((project) =>
            project.id === selectedProject.id
              ? { ...project, servers: [...project.servers, createdServer] }
              : project
          )
        )
      } else if (editingServerId) {
        const response = await axiosInstance.patch<{ status: string; data: Server }>(
          UPDATE_SERVER_MANAGEMENT_SERVER(selectedProject.id, editingServerId),
          payload
        )
        const updatedServer = response.data.data
        setProjects((prev) =>
          prev.map((project) =>
            project.id === selectedProject.id
              ? {
                  ...project,
                  servers: project.servers.map((server) =>
                    server.id === editingServerId ? updatedServer : server
                  ),
                }
              : project
          )
        )
      }

      setServerModalOpen(false)
    } catch (error) {
      setServerFormError(getErrorMessage(error, 'Unable to save server'))
    } finally {
      setServerSaving(false)
    }
  }

  const handleDeleteServer = async (serverId: string, projectId?: string) => {
    const targetProjectId = projectId ?? selectedProject?.id
    if (!targetProjectId) return
    await axiosInstance.delete(DELETE_SERVER_MANAGEMENT_SERVER(targetProjectId, serverId))
    setProjects((prev) =>
      prev.map((project) =>
        project.id === targetProjectId
          ? { ...project, servers: project.servers.filter((server) => server.id !== serverId) }
          : project
      )
    )
    if (routeServerId === serverId) {
      navigate(`/server-management/projects/${targetProjectId}`)
    }
  }

  const isActionRunnable = (action: Action) => (action.dangerous ? canElevatedUse : canUse)

  const openRemoveProject = (project: Project) => {
    if (!canManage) return
    setRemovalError(null)
    setPendingRemoval({ type: 'project', projectId: project.id, name: project.name })
  }

  const openRemoveServer = (projectId: string, server: Server) => {
    if (!canManage) return
    setRemovalError(null)
    setPendingRemoval({ type: 'server', projectId, serverId: server.id, name: server.name })
  }

  const closeRemoveModal = () => {
    setPendingRemoval(null)
    setRemovalError(null)
  }

  const confirmRemove = async () => {
    if (!pendingRemoval || removalLoading) return
    if (!canManage) {
      setPendingRemoval(null)
      return
    }
    setRemovalError(null)
    setRemovalLoading(true)
    try {
      if (pendingRemoval.type === 'project') {
        await handleDeleteProject(pendingRemoval.projectId)
      } else if (pendingRemoval.serverId) {
        await handleDeleteServer(pendingRemoval.serverId, pendingRemoval.projectId)
      }
      setPendingRemoval(null)
    } catch (error) {
      setRemovalError(getErrorMessage(error, 'Unable to remove item'))
    } finally {
      setRemovalLoading(false)
    }
  }

  const closeStatusModal = () => {
    setStatusModalOpen(false)
    setStatusLoading(false)
    setStatusRefreshing(false)
    setStatusError(null)
    setStatusData({})
    setStatusServerId(null)
    setStatusServerName('')
    setStatusPayload(null)
  }

  const fetchServerStatus = useCallback(
    async (serverId: string, options: { initial?: boolean } = {}) => {
      if (!canUse) return
      const initial = options.initial ?? false
      if (statusPollInFlightRef.current && !initial) return

      statusPollInFlightRef.current = true
      if (initial) {
        setStatusLoading(true)
      } else {
        setStatusRefreshing(true)
      }
      setStatusError(null)

      try {
        const response = await axiosInstance.post<{
          status: string
          data: { status?: Record<string, unknown>; rawOutput?: string }
        }>(GET_SERVER_STATUS(serverId))
        const status = response.data?.data?.status ?? {}
        const rawOutput = response.data?.data?.rawOutput

        let parsedPayload: StatusPayload | null = null
        if (typeof rawOutput === 'string') {
          try {
            const parsed = JSON.parse(rawOutput.trim())
            if (isPlainObject(parsed)) {
              parsedPayload = parsed as StatusPayload
            }
          } catch {
            // Fall back to status map
          }
        }
        if (!parsedPayload && isPlainObject(status)) {
          const candidate = status as StatusPayload
          if (isStatusInstance(candidate.instance) || isStatusDocker(candidate.docker)) {
            parsedPayload = candidate
          }
        }

        setStatusPayload(parsedPayload)

        const normalized: Record<string, string> = {}
        if (status && typeof status === 'object' && !Array.isArray(status)) {
          Object.entries(status as Record<string, unknown>).forEach(([key, value]) => {
            const normalizedKey = key.trim().toLowerCase()
            if (normalizedKey === 'host' || normalizedKey === 'hostname') {
              return
            }
            const formatted = formatStatusValue(value)
            if (formatted.length > 0) {
              normalized[key] = formatted
            }
          })
        }
        setStatusData(normalized)
      } catch (error) {
        setStatusError(getErrorMessage(error, 'Unable to load server status'))
      } finally {
        statusPollInFlightRef.current = false
        if (initial) {
          setStatusLoading(false)
        } else {
          setStatusRefreshing(false)
        }
      }
    },
    [canUse]
  )

  const openStatusModal = async (server: Server) => {
    if (!canUse) return
    setStatusServerName(server.name)
    setStatusServerId(server.id)
    setStatusModalOpen(true)
    setStatusError(null)
    setStatusData({})
    setStatusPayload(null)

    await fetchServerStatus(server.id, { initial: true })
  }

  useEffect(() => {
    if (!statusModalOpen || !statusServerId) return
    const intervalId = window.setInterval(() => {
      void fetchServerStatus(statusServerId)
    }, 2000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [statusModalOpen, statusServerId, fetchServerStatus])

  const openConfirmAction = (action: Action, server: Server) => {
    if (!isActionRunnable(action)) return
    setPendingAction({ action, server })
    setConfirmInput('')
    setActionRunError(null)
  }

  const closeConfirmAction = () => {
    setPendingAction(null)
    setConfirmInput('')
    setActionRunError(null)
  }

  const isActionRunPending =
    Boolean(pendingAction) && actionRunPendingId === pendingAction?.action.id

  const confirmEnabled =
    (!pendingAction?.action.dangerous ||
      confirmInput.trim().toLowerCase() === 'confirm') &&
    !isActionRunPending

  const handleConfirmRun = async () => {
    if (!pendingAction || !confirmEnabled || isActionRunPending) return
    setActionRunError(null)

    const { action, server } = pendingAction
    setActionRunPendingId(action.id)
    try {
      const response = await axiosInstance.post<{ status: string; data: { runId: string } }>(
        RUN_SERVER_MANAGEMENT_ACTION(server.id, action.id)
      )
      const runId = response.data?.data?.runId
      if (!runId) {
        throw new Error('Run ID not returned')
      }

      const timestamp = new Date().toISOString()
      const lines = [
        `[${timestamp}] Run requested`,
        `$ ${action.command}`,
        `Run ID: ${runId}`,
        socketConnected ? 'Awaiting output...' : 'Socket disconnected. Output may not stream.',
      ]

      setCliOutput({
        runId,
        actionName: action.name,
        serverName: server.name,
        host: server.host,
        command: action.command,
        status: 'running',
        lines,
      })
      setPendingAction(null)
      setConfirmInput('')
    } catch (error) {
      setActionRunError(getErrorMessage(error, 'Unable to start action'))
    } finally {
      setActionRunPendingId(null)
    }
  }

  const projectEmojiPickerPortal =
    projectEmojiPickerOpen && projectEmojiPickerPosition
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setProjectEmojiPickerOpen(false)}
              aria-hidden="true"
            />
            <div
              className="fixed z-[70] w-80 p-3 bg-popover border border-border rounded-lg shadow-xl max-h-[360px] overflow-y-auto"
              style={{
                top: projectEmojiPickerPosition.top,
                left: projectEmojiPickerPosition.left,
              }}
            >
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                    {category}
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {emojis.map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => {
                          setProjectForm((prev) => ({ ...prev, emoji: emo }))
                          setProjectEmojiPickerOpen(false)
                        }}
                        className={cn(
                          'h-8 w-8 flex items-center justify-center rounded hover:bg-accent transition-colors text-lg',
                          projectForm.emoji === emo && 'bg-primary/10 ring-2 ring-primary'
                        )}
                        aria-label={`Select ${emo}`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>,
          document.body
        )
      : null

  const renderProjectsList = () => (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Server Management
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} projects - {totalServers} servers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              className="border border-border/60"
              onClick={openCreateProject}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          )}
        </div>
      </header>

      {projectsError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{projectsError}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchProjects()}>
            Retry
          </Button>
        </div>
      )}

      {projectsLoading && (
        <p className="text-sm text-muted-foreground">Loading projects...</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className={cn(cardClassName, 'cursor-pointer hover:border-border transition-colors')}
            onClick={() => navigate(`/server-management/projects/${project.id}`)}
            role="button"
            tabIndex={0}
            aria-label={`Open ${project.name}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/server-management/projects/${project.id}`)
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 aspect-square items-center justify-center rounded-full border border-border bg-muted text-lg">
                {project.emoji}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{project.name}</h2>
                  <Badge variant="outline" className="text-xs">
                    {project.servers.length} servers
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      openEditProject(project)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={(event) => {
                      event.stopPropagation()
                      openRemoveProject(project)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {!projectsLoading && !projectsError && projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No projects yet. Create one to start managing servers.
        </div>
      )}
    </section>
  )

  const renderProjectDetail = (project: Project) => (
    <section className="space-y-6">
      <header className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => navigate('/server-management')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Projects
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 aspect-square items-center justify-center rounded-full border border-border bg-muted text-2xl">
              {project.emoji}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Project</p>
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
              <p className="text-sm text-muted-foreground">{project.servers.length} servers</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={() => openEditProject(project)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Project
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="border border-border/60"
                  onClick={openCreateServer}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Server
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => openRemoveProject(project)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Project
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {project.servers.map((server) => (
          <div
            key={server.id}
            className={cn(cardClassName, 'cursor-pointer hover:border-border transition-colors')}
            onClick={() => navigate(`/server-management/projects/${project.id}/servers/${server.id}`)}
            role="button"
            tabIndex={0}
            aria-label={`Open ${server.name}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/server-management/projects/${project.id}/servers/${server.id}`)
              }
            }}
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{server.name}</h2>
              <p className="text-sm text-muted-foreground">{server.summary}</p>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Host</p>
                <p className="text-sm font-medium">{server.host}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      openEditServer(server)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={(event) => {
                      event.stopPropagation()
                      openRemoveServer(project.id, server)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {project.servers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No servers yet. Add a server to start managing actions.
        </div>
      )}
    </section>
  )

  const renderServerDetail = (project: Project, server: Server) => {
    return (
      <section className="space-y-6">
        <header className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => navigate(`/server-management/projects/${project.id}`)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {project.name}
          </Button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Server</p>
              <h1 className="text-2xl font-semibold tracking-tight">{server.name}</h1>
              <p className="text-sm text-muted-foreground max-w-2xl">{server.summary}</p>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Host</p>
                <p className="text-sm font-medium">{server.host}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openStatusModal(server)}
                disabled={!canUse || statusLoading}
              >
                <Activity className="mr-2 h-4 w-4" />
                View Status
              </Button>
              {canManage && (
                <>
                  <Button variant="outline" size="sm" onClick={() => openEditServer(server)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Server
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => openRemoveServer(project.id, server)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Server
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/90 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Connection</p>
              <p className="text-sm font-semibold">Access details</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Host</span>
                <span className="font-medium text-right break-all">{server.host || '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/90 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Automation</p>
              <p className="text-sm font-semibold">{server.actions.length} actions configured</p>
              <p className="text-xs text-muted-foreground">
                Dangerous actions require an extra confirmation step.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Runnable actions</span>
                <span className="font-medium text-right">
                  {server.actions.filter((action) => action.command?.trim()).length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Dangerous actions</span>
                <span className="font-medium text-right">
                  {server.actions.filter((action) => action.dangerous).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Actions</h2>
              <p className="text-sm text-muted-foreground">Run approved automation on this server.</p>
            </div>
          </div>

          <div className="space-y-3">
            {server.actions.map((action) => (
              <div
                key={action.id}
                className={cn(
                  'rounded-2xl border border-border/60 bg-background/90 p-4',
                  action.dangerous && 'border-destructive/40 bg-destructive/5'
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{action.name}</h3>
                      {action.dangerous && (
                        <Badge variant="destructive" className="text-xs">
                          Dangerous
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(action.dangerous && 'text-destructive border-destructive/50')}
                    onClick={() => openConfirmAction(action, server)}
                    disabled={!isActionRunnable(action) || actionRunPendingId === action.id}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Run
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {server.actions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              No actions configured yet.
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {!selectedProject && renderProjectsList()}
      {selectedProject && !selectedServer && renderProjectDetail(selectedProject)}
      {selectedProject && selectedServer && renderServerDetail(selectedProject, selectedServer)}

      <Modal open={projectModalOpen} onClose={closeProjectModal} className="max-h-[85vh]">
        <div className="flex h-full flex-col">
          <div className="border-b border-border/60 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {projectModalMode === 'create' ? 'Create Project' : 'Edit Project'}
                </h2>
                <p className="text-sm text-muted-foreground">All fields are required.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeProjectModal}
                aria-label="Close project modal"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
            onScroll={() => {
              if (projectEmojiPickerOpen) {
                setProjectEmojiPickerOpen(false)
              }
            }}
          >
            {projectFormError && (
              <p className="text-sm text-destructive">{projectFormError}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <label className="text-sm font-medium">Emoji</label>
                <div className="flex items-center gap-2">
                  <button
                    ref={projectEmojiButtonRef}
                    type="button"
                    onClick={() => setProjectEmojiPickerOpen((prev) => !prev)}
                    className={cn(
                      'h-10 w-10 flex items-center justify-center rounded-lg border border-input bg-background text-lg hover:bg-accent transition-colors',
                      projectFormErrors.emoji && 'border-destructive/60'
                    )}
                    aria-label="Pick emoji"
                    title="Pick emoji"
                  >
                    <span className="max-w-[2.5rem] truncate">
                      {projectForm.emoji ? projectForm.emoji : '🙂'}
                    </span>
                  </button>
                  <Input
                    value={projectForm.emoji}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, emoji: e.target.value }))}
                    placeholder="🛰️ or custom text"
                    className={cn(projectFormErrors.emoji && fieldErrorClass)}
                  />
                </div>
                {projectFormErrors.emoji && (
                  <p className="text-xs text-destructive">{projectFormErrors.emoji}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Project name"
                  className={cn(projectFormErrors.name && fieldErrorClass)}
                />
                {projectFormErrors.name && (
                  <p className="text-xs text-destructive">{projectFormErrors.name}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What does this project own?"
                className={cn('min-h-[120px]', projectFormErrors.description && fieldErrorClass)}
              />
              {projectFormErrors.description && (
                <p className="text-xs text-destructive">{projectFormErrors.description}</p>
              )}
            </div>
          </div>
          <div className="border-t border-border/60 px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeProjectModal}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="border border-border/60"
              onClick={handleSaveProject}
              disabled={projectSaving}
            >
              Save Project
            </Button>
          </div>
        </div>
        {projectEmojiPickerPortal}
      </Modal>

      <Modal open={serverModalOpen} onClose={() => setServerModalOpen(false)} className="max-h-[85vh]" maxWidth="5xl">
        <div className="flex h-full flex-col min-h-0">
          <div className="border-b border-border/60 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {serverModalMode === 'create' ? 'Add Server' : 'Edit Server'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Required fields must be filled. Optional fields remain hidden in the UI.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setServerModalOpen(false)}
                aria-label="Close server modal"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
            {serverFormError && (
              <p className="text-sm text-destructive">{serverFormError}</p>
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Server Info
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={serverForm.name}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Server name"
                    className={cn(serverFormErrors.name && fieldErrorClass)}
                  />
                  {serverFormErrors.name && (
                    <p className="text-xs text-destructive">{serverFormErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Host</label>
                  <Input
                    value={serverForm.host}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, host: e.target.value }))}
                    placeholder="host.example.com"
                    className={cn(serverFormErrors.host && fieldErrorClass)}
                  />
                  {serverFormErrors.host && (
                    <p className="text-xs text-destructive">{serverFormErrors.host}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Summary</label>
                <Textarea
                  value={serverForm.summary}
                  onChange={(e) => setServerForm((prev) => ({ ...prev, summary: e.target.value }))}
                  placeholder="What does this server handle?"
                  className={cn('min-h-[100px]', serverFormErrors.summary && fieldErrorClass)}
                />
                {serverFormErrors.summary && (
                  <p className="text-xs text-destructive">{serverFormErrors.summary}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Optional Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Port</label>
                  <Input
                    value={serverForm.port}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, port: e.target.value }))}
                    placeholder="443"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">User</label>
                  <Input
                    value={serverForm.user}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, user: e.target.value }))}
                    placeholder="deploy"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SSH Key</label>
                  <Textarea
                    value={serverForm.sshKey}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, sshKey: e.target.value }))}
                    placeholder="Paste private key (leave blank to keep unchanged)"
                    className="min-h-[140px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">App Directory</label>
                  <Input
                    value={serverForm.appDirectory}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, appDirectory: e.target.value }))}
                    placeholder="/home/ubuntu/talenttap"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Command</label>
                  <Input
                    value={serverForm.statusCommand}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, statusCommand: e.target.value }))}
                    placeholder="./instancectl status"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Actions
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Action commands stay hidden in the UI, except inside this configuration form.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setServerForm((prev) => ({ ...prev, actions: [...prev.actions, createAction()] }))}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Action
                </Button>
              </div>

              <div className="space-y-4">
                {serverForm.actions.map((action) => {
                  const actionError = serverFormErrors.actions?.[action.id]
                  return (
                    <div
                      key={action.id}
                      className="rounded-2xl border border-border/60 bg-background/90 p-4 space-y-3"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2 flex-1">
                          <label className="text-sm font-medium">Action Name</label>
                          <Input
                            value={action.name}
                            onChange={(e) => updateServerAction(action.id, { name: e.target.value })}
                            placeholder="Deploy"
                            className={cn(actionError?.name && fieldErrorClass)}
                          />
                          {actionError?.name && (
                            <p className="text-xs text-destructive">{actionError.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={action.dangerous ?? false}
                              onCheckedChange={(checked) => updateServerAction(action.id, { dangerous: checked })}
                            />
                            <span className="text-sm">Dangerous</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeServerAction(action.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            value={action.description}
                            onChange={(e) => updateServerAction(action.id, { description: e.target.value })}
                            placeholder="Describe what this action does."
                            className={cn('min-h-[90px]', actionError?.description && fieldErrorClass)}
                          />
                          {actionError?.description && (
                            <p className="text-xs text-destructive">{actionError.description}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Command</label>
                          <Input
                            value={action.command}
                            onChange={(e) => updateServerAction(action.id, { command: e.target.value })}
                            placeholder="./instancectl deploy"
                            className={cn(actionError?.command && fieldErrorClass)}
                          />
                          {actionError?.command && (
                            <p className="text-xs text-destructive">{actionError.command}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="border-t border-border/60 px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setServerModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="border border-border/60"
              onClick={handleSaveServer}
              disabled={serverSaving}
            >
              Save Server
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(pendingRemoval)} onClose={closeRemoveModal} maxWidth="lg">
        {pendingRemoval && (
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h2 className="text-lg font-semibold">
                      {pendingRemoval.type === 'project' ? 'Remove Project' : 'Remove Server'}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{pendingRemoval.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeRemoveModal}
                  aria-label="Close removal modal"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {pendingRemoval.type === 'project'
                  ? 'This will remove the project and its servers from the workspace.'
                  : 'This will remove the server from the project.'}
              </p>
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              {removalError && (
                <p className="text-sm text-destructive">{removalError}</p>
              )}
            </div>
            <div className="border-t border-border/60 px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeRemoveModal}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmRemove} disabled={removalLoading}>
                Confirm Remove
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={statusModalOpen} onClose={closeStatusModal} maxWidth="6xl" className="h-[92vh] sm:h-[90vh]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Server Status</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{statusServerName || 'Status snapshot'}</span>
                  {statusModalOpen && (
                    <Badge variant="secondary" className="text-xs">
                      Live (2s)
                    </Badge>
                  )}
                  {statusRefreshing && (
                    <span className="text-xs text-muted-foreground">Updating...</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeStatusModal}
                aria-label="Close status modal"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
            {statusLoading && (
              <p className="text-sm text-muted-foreground">Loading status...</p>
            )}
            {statusError && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {statusError}
              </div>
            )}
            {!statusLoading && statusHasStructured && (
              <div className="space-y-6">
                {statusPayload?.timestamp && (
                  <p className="text-xs text-muted-foreground">Last updated: {statusPayload.timestamp}</p>
                )}

                {instanceStatus && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Instance
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CPU Load</p>
                        <p className="text-sm font-semibold">
                          {formatLoadAvg(instanceStatus.cpu?.loadavg_1m)} /{' '}
                          {formatLoadAvg(instanceStatus.cpu?.loadavg_5m)} /{' '}
                          {formatLoadAvg(instanceStatus.cpu?.loadavg_15m)}
                        </p>
                        <p className="text-xs text-muted-foreground">1m / 5m / 15m</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Memory</p>
                        <p className="text-sm font-semibold">
                          {formatUsage(instanceStatus.mem?.used_bytes, instanceStatus.mem?.total_bytes)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Available: {formatBytes(instanceStatus.mem?.available_bytes)}
                        </p>
                        {renderPercentBar(
                          getUsagePercent(instanceStatus.mem?.used_bytes, instanceStatus.mem?.total_bytes),
                          'bg-emerald-500/80'
                        )}
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Storage</p>
                        <p className="text-sm font-semibold">
                          {formatUsage(instanceStatus.storage_root?.used_bytes, instanceStatus.storage_root?.total_bytes)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Available: {formatBytes(instanceStatus.storage_root?.available_bytes)}
                        </p>
                        {renderPercentBar(
                          getUsagePercent(instanceStatus.storage_root?.used_bytes, instanceStatus.storage_root?.total_bytes),
                          'bg-sky-500/80'
                        )}
                      </div>
                    </div>

                    {networkGroups.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Network</p>
                          <span className="text-xs text-muted-foreground">
                            {networkGroups.reduce((total, group) => total + group.entries.length, 0)} interfaces
                          </span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {networkGroups.map((group) => (
                            <div
                              key={group.label}
                              className="rounded-2xl border border-border/60 bg-background/90 p-4 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold">{group.label}</p>
                                  {group.description && (
                                    <p className="text-xs text-muted-foreground">{group.description}</p>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {group.entries.length} interfaces
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <span>RX: {formatBytes(group.totalRx)}</span>
                                <span>TX: {formatBytes(group.totalTx)}</span>
                              </div>
                              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                {group.entries.map(({ name, stats }) => (
                                  <div
                                    key={name}
                                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                                  >
                                    <span className="font-medium">{name}</span>
                                    <span className="text-muted-foreground">
                                      {formatBytes(stats?.rx_bytes)} rx / {formatBytes(stats?.tx_bytes)} tx
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {dockerStatus && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Docker
                      </h3>
                      {containerEntries.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {containerEntries.length} containers
                        </span>
                      )}
                    </div>
                    {dockerStatus.compose_ps_error && (
                      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                        {dockerStatus.compose_ps_error}
                      </div>
                    )}
                    {containerEntries.length === 0 && !dockerStatus.compose_ps_error && (
                      <p className="text-sm text-muted-foreground">No container data returned.</p>
                    )}
                    {containerEntries.length > 0 && (
                      <div className="rounded-2xl border border-border/60 bg-background/90 overflow-hidden">
                        <div className="overflow-x-auto">
                          <div className="min-w-[880px]">
                            <div className="grid grid-cols-[minmax(180px,1.3fr)_minmax(180px,1fr)_minmax(90px,0.5fr)_minmax(160px,0.9fr)_minmax(160px,0.9fr)_minmax(150px,0.8fr)] gap-4 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              <span>Container</span>
                              <span>Status</span>
                              <span>CPU</span>
                              <span>Memory</span>
                              <span>Network</span>
                              <span>Block I/O</span>
                            </div>
                            <div className="divide-y divide-border/60">
                              {containerEntries.map(([key, container]) => {
                                const name = container.name ?? key
                                const state = container.state?.trim()
                                const health = container.health?.trim()
                                const healthVariant =
                                  health && health.toLowerCase() === 'healthy' ? 'secondary' : 'destructive'
                                const cpuPercent = clampPercent(container.cpu_percent)
                                const memPercent = getContainerMemPercent(container.mem)
                                return (
                                  <div
                                    key={key}
                                    className="grid grid-cols-[minmax(180px,1.3fr)_minmax(180px,1fr)_minmax(90px,0.5fr)_minmax(160px,0.9fr)_minmax(160px,0.9fr)_minmax(150px,0.8fr)] gap-4 px-4 py-3 text-sm"
                                  >
                                    <div className="space-y-1">
                                      <p className="font-medium">{name}</p>
                                      {container.container_id && (
                                        <p className="text-xs text-muted-foreground">{container.container_id}</p>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap gap-1">
                                        {state && (
                                          <Badge
                                            variant={state === 'running' ? 'secondary' : 'outline'}
                                            className="text-xs"
                                          >
                                            {state}
                                          </Badge>
                                        )}
                                        {health && (
                                          <Badge variant={healthVariant} className="text-xs">
                                            {health}
                                          </Badge>
                                        )}
                                      </div>
                                      {container.status && (
                                        <p className="text-xs text-muted-foreground">{container.status}</p>
                                      )}
                                      {typeof container.pids === 'number' && (
                                        <p className="text-xs text-muted-foreground">PIDs: {container.pids}</p>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-sm">{formatContainerCpu(container)}</div>
                                      {renderPercentBar(cpuPercent, 'bg-amber-500/70')}
                                    </div>
                                    <div>
                                      <div className="text-sm">{formatContainerMem(container.mem)}</div>
                                      {renderPercentBar(memPercent, 'bg-emerald-500/70')}
                                    </div>
                                    <div>{formatContainerTransfer(container.net)}</div>
                                    <div>{formatContainerBlock(container.block)}</div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
            {!statusLoading && !statusError && !statusHasStructured && Object.keys(statusData).length === 0 && (
              <p className="text-sm text-muted-foreground">No status entries returned.</p>
            )}
            {!statusLoading && !statusHasStructured && Object.keys(statusData).length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(statusData).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-border/60 bg-background/90 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{key}</p>
                    <p className="text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border/60 px-6 py-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={closeStatusModal}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(pendingAction)} onClose={closeConfirmAction} maxWidth="lg">
        {pendingAction && (
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {pendingAction.action.dangerous && (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    <h2 className="text-lg font-semibold">Confirm Action</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pendingAction.action.name} - {pendingAction.server.name}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={closeConfirmAction} aria-label="Close confirmation modal">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm">
                <p className="font-medium">{pendingAction.action.description}</p>
                <p className="mt-2 text-muted-foreground">Host: {pendingAction.server.host}</p>
              </div>

              {pendingAction.action.dangerous && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Dangerous action. Type CONFIRM to proceed.
                  </p>
                  <Input
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="CONFIRM"
                  />
                </div>
              )}
              {actionRunError && (
                <p className="text-sm text-destructive">{actionRunError}</p>
              )}
            </div>
            <div className="border-t border-border/60 px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeConfirmAction}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={cn(
                  'border border-border/60',
                  pendingAction.action.dangerous && 'bg-destructive text-destructive-foreground'
                )}
                onClick={handleConfirmRun}
                disabled={!confirmEnabled}
              >
                Run Action
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(cliOutput)} onClose={() => setCliOutput(null)} maxWidth="4xl">
        {cliOutput && (
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">CLI Output</h2>
                  <p className="text-sm text-muted-foreground">
                    {cliOutput.actionName} - {cliOutput.serverName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      cliOutput.status === 'success' || cliOutput.status === 'running'
                        ? 'secondary'
                        : 'destructive'
                    }
                    className="text-xs"
                  >
                    {cliOutput.status === 'running'
                      ? 'Running'
                      : cliOutput.status === 'success'
                        ? 'Success'
                        : cliOutput.status === 'failure'
                          ? 'Failed'
                          : 'Error'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCliOutput(null)}
                    aria-label="Close CLI output modal"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <pre
                ref={cliOutputRef}
                onScroll={() => {
                  const output = cliOutputRef.current
                  if (!output) return
                  const threshold = 24
                  const distanceFromBottom = output.scrollHeight - output.scrollTop - output.clientHeight
                  cliAutoScrollRef.current = distanceFromBottom <= threshold
                }}
                className="max-h-[60vh] overflow-y-auto rounded-2xl border border-border/60 bg-slate-950 text-slate-100 p-4 text-sm leading-relaxed font-mono"
                dangerouslySetInnerHTML={{ __html: cliOutputHtml }}
              />
            </div>
            <div className="border-t border-border/60 px-6 py-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setCliOutput(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
