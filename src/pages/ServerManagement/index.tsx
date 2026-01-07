import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AnsiToHtml from 'ansi-to-html'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
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
import type { Action, ActionRisk, Project, Server, Service } from './types'

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

type ServiceFormErrors = {
  name?: string
  actions?: Record<string, ActionErrors>
}

type ServerFormErrors = {
  name?: string
  summary?: string
  host?: string
  services?: Record<string, ServiceFormErrors>
}

type ServiceFormState = {
  id: string
  name: string
  serviceName: string
  actions: Action[]
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
  services: ServiceFormState[]
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
  cpu_percent?: number | string
  cpu_raw?: string
  cpu?: number | string
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
  services: [],
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
  risk: 'normal',
})

const createService = (): ServiceFormState => ({
  id: createId('service'),
  name: '',
  serviceName: '',
  actions: [createAction()],
})

const ACTION_RISK_LABELS: Record<ActionRisk, string> = {
  normal: 'Normal',
  warning: 'Warning',
  dangerous: 'Dangerous',
}

const ACTION_RISK_BADGE_CLASS: Record<ActionRisk, string> = {
  normal: '',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700',
  dangerous: '',
}

const getActionRisk = (action: { risk?: ActionRisk; dangerous?: boolean }): ActionRisk => {
  if (action.risk === 'normal' || action.risk === 'warning' || action.risk === 'dangerous') {
    return action.risk
  }
  if (action.dangerous) return 'dangerous'
  return 'normal'
}

const requiresConfirm = (risk: ActionRisk) => risk === 'dangerous'

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

const formatContainerMemPair = (mem?: StatusUsage) => {
  if (!mem) return '—'
  if (mem.raw) return mem.raw
  if (typeof mem.usage_bytes === 'number' && typeof mem.limit_bytes === 'number') {
    return `${formatBytes(mem.usage_bytes)} / ${formatBytes(mem.limit_bytes)}`
  }
  return '—'
}

const clampPercent = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, value))
}

const formatPercentShort = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${Math.round(value)}%`
}

const getUsageTone = (percent: number | null) => {
  if (percent === null) return 'bg-muted-foreground/30'
  if (percent >= 80) return 'bg-rose-500/80'
  if (percent >= 60) return 'bg-amber-500/80'
  return 'bg-emerald-500/80'
}

const formatContainerCpu = (container: DockerContainerStatus) => {
  if (typeof container.cpu_raw === 'string' && container.cpu_raw.trim()) return container.cpu_raw.trim()
  if (typeof container.cpu_percent === 'number') return formatPercent(container.cpu_percent)
  if (typeof container.cpu_percent === 'string' && container.cpu_percent.trim()) return container.cpu_percent.trim()
  if (typeof container.cpu === 'number') return formatPercent(container.cpu)
  if (typeof container.cpu === 'string' && container.cpu.trim()) return container.cpu.trim()
  return '—'
}

const parseCpuPercent = (value?: number | string) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const getContainerCpuPercent = (container: DockerContainerStatus) => {
  const percent =
    parseCpuPercent(container.cpu_percent) ??
    parseCpuPercent(container.cpu) ??
    parseCpuPercent(container.cpu_raw)
  return clampPercent(percent ?? undefined)
}

const normalizeContainerKey = (value?: string) => (value ?? '').trim().toLowerCase()
const normalizeContainerMatch = (value?: string) => normalizeContainerKey(value).replace(/[^a-z0-9]+/g, '')

const getContainerForService = (
  service: Service,
  containers?: Record<string, DockerContainerStatus>
): DockerContainerStatus | undefined => {
  if (!containers) return undefined

  const candidates = [service.serviceName, service.name]
  for (const candidate of candidates) {
    const normalized = normalizeContainerKey(candidate)
    if (!normalized) continue
    const matchKey = Object.keys(containers).find((key) => key.toLowerCase() === normalized)
    if (matchKey) {
      return containers[matchKey]
    }
    const normalizedMatch = normalizeContainerMatch(candidate)
    if (normalizedMatch) {
      const relaxedKey = Object.keys(containers).find(
        (key) => normalizeContainerMatch(key) === normalizedMatch
      )
      if (relaxedKey) {
        return containers[relaxedKey]
      }
      const relaxedContainer = Object.values(containers).find(
        (container) => normalizeContainerMatch(container.name) === normalizedMatch
      )
      if (relaxedContainer) {
        return relaxedContainer
      }
    }
  }

  return undefined
}

const formatContainerNet = (net?: StatusTransfer) => {
  if (!net) return '—'
  if (net.raw) return net.raw
  if (typeof net.rx_bytes === 'number' && typeof net.tx_bytes === 'number') {
    return `${formatBytes(net.rx_bytes)} / ${formatBytes(net.tx_bytes)}`
  }
  return '—'
}

const SIZE_UNIT_FACTORS: Record<string, number> = {
  B: 1,
  KB: 1024,
  KIB: 1024,
  MB: 1024 ** 2,
  MIB: 1024 ** 2,
  GB: 1024 ** 3,
  GIB: 1024 ** 3,
  TB: 1024 ** 4,
  TIB: 1024 ** 4,
  PB: 1024 ** 5,
  PIB: 1024 ** 5,
}

const normalizeSizeUnit = (unit?: string) => {
  if (!unit) return 'B'
  const upper = unit.toUpperCase()
  if (upper === 'K') return 'KB'
  if (upper === 'M') return 'MB'
  if (upper === 'G') return 'GB'
  if (upper === 'T') return 'TB'
  if (upper === 'P') return 'PB'
  return upper
}

const parseSizeValue = (value: string) => {
  const match = value.trim().replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)?/)
  if (!match) return null
  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount)) return null
  const unit = normalizeSizeUnit(match[2])
  const factor = SIZE_UNIT_FACTORS[unit]
  if (!factor) return null
  return amount * factor
}

const parseSizePair = (raw: string) => {
  const parts = raw.split('/')
  let total = 0
  let parsedAny = false
  parts.forEach((part) => {
    const parsed = parseSizeValue(part)
    if (parsed !== null) {
      total += parsed
      parsedAny = true
    }
  })
  return parsedAny ? total : null
}

const parseSizePairParts = (raw: string) => {
  const parts = raw.split('/')
  const read = parts[0] ? parseSizeValue(parts[0]) : null
  const write = parts[1] ? parseSizeValue(parts[1]) : null
  return { read, write }
}

const getTransferTotal = (net?: StatusTransfer) => {
  if (!net) return null
  if (typeof net.rx_bytes === 'number' && typeof net.tx_bytes === 'number') {
    return net.rx_bytes + net.tx_bytes
  }
  if (net.raw) return parseSizePair(net.raw)
  return null
}

const getBlockReadWrite = (block?: StatusBlock) => {
  if (!block) return { read: null, write: null }
  if (typeof block.read_bytes === 'number' || typeof block.write_bytes === 'number') {
    return {
      read: typeof block.read_bytes === 'number' ? block.read_bytes : null,
      write: typeof block.write_bytes === 'number' ? block.write_bytes : null,
    }
  }
  if (block.raw) return parseSizePairParts(block.raw)
  return { read: null, write: null }
}

const getUsagePercent = (used?: number, total?: number) => {
  if (typeof used !== 'number' || typeof total !== 'number' || !Number.isFinite(used) || !Number.isFinite(total)) {
    return null
  }
  if (total <= 0) return null
  return clampPercent((used / total) * 100)
}

const getRelativePercent = (value?: number | null, max?: number | null) => {
  if (value === null || typeof value !== 'number' || !Number.isFinite(value)) return null
  if (max === null || typeof max !== 'number' || !Number.isFinite(max) || max <= 0) return null
  return clampPercent((value / max) * 100)
}

const getContainerMemPercent = (mem?: StatusUsage) => {
  if (!mem) return null
  if (typeof mem.percent === 'number') return clampPercent(mem.percent)
  return getUsagePercent(mem.usage_bytes, mem.limit_bytes)
}

const renderPercentBar = (percent: number | null, toneClass: string) => {
  if (percent === null) return null
  return (
    <div className="mt-2 h-1.5 w-full bg-muted/60">
      <div className={cn('h-full transition-all', toneClass)} style={{ width: `${percent}%` }} />
    </div>
  )
}

const renderMiniBar = (percent: number | null, toneClass: string) => {
  if (percent === null) return null
  return (
    <div className="h-1 w-full bg-muted/60">
      <div className={cn('h-full transition-all', toneClass)} style={{ width: `${percent}%` }} />
    </div>
  )
}

const renderFlatBar = (percent: number | null, toneClass: string) => {
  if (percent === null) return null
  return (
    <div className="mt-1.5 h-1.5 w-full bg-muted/60">
      <div className={cn('h-full transition-all', toneClass)} style={{ width: `${percent}%` }} />
    </div>
  )
}

const getSplitPercents = (read?: number | null, write?: number | null) => {
  const safeRead = typeof read === 'number' && Number.isFinite(read) ? read : 0
  const safeWrite = typeof write === 'number' && Number.isFinite(write) ? write : 0
  const total = safeRead + safeWrite
  if (total <= 0) return { read: null, write: null }
  return {
    read: clampPercent((safeRead / total) * 100),
    write: clampPercent((safeWrite / total) * 100),
  }
}

const renderSplitBar = (readPercent: number | null, writePercent: number | null) => {
  if (readPercent === null && writePercent === null) return null
  const safeRead = Math.max(0, readPercent ?? 0)
  const safeWrite = Math.max(0, writePercent ?? 0)
  if (safeRead === 0 && safeWrite === 0) return null
  const total = safeRead + safeWrite
  const readWidth = total > 0 ? (safeRead / total) * 100 : 0
  const writeWidth = total > 0 ? (safeWrite / total) * 100 : 0
  const hasBoth = readWidth > 0 && writeWidth > 0
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden bg-muted/60">
      <div className={cn('flex h-full w-full', hasBoth && 'gap-px')}>
        <div className="h-full bg-teal-500/70" style={{ width: `${readWidth}%` }} />
        <div className="h-full bg-amber-500/70" style={{ width: `${writeWidth}%` }} />
      </div>
    </div>
  )
}

const getLoadBarPercent = (value?: number, max?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (typeof max !== 'number' || !Number.isFinite(max) || max <= 0) return null
  return clampPercent((value / max) * 100)
}

type ServiceStatusTone = 'good' | 'warning' | 'error' | 'stopped' | 'muted'

const SERVICE_STATUS_STYLES: Record<ServiceStatusTone, { dot: string; text: string }> = {
  good: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-700' },
  error: { dot: 'bg-rose-500', text: 'text-rose-700' },
  stopped: { dot: 'bg-slate-400', text: 'text-slate-500' },
  muted: { dot: 'bg-slate-300', text: 'text-muted-foreground' },
}

const getServiceStatusSummary = (state?: string, health?: string) => {
  const normalizedState = state?.trim().toLowerCase()
  const normalizedHealth = health?.trim().toLowerCase()

  if (!normalizedState) {
    return { label: 'Unknown', tone: 'muted' as ServiceStatusTone }
  }

  if (normalizedState === 'running') {
    if (normalizedHealth && normalizedHealth !== 'healthy') {
      const label = normalizedHealth === 'unhealthy' ? 'Unhealthy' : 'Degraded'
      const tone = normalizedHealth === 'unhealthy' ? 'error' : 'warning'
      return { label, tone: tone as ServiceStatusTone }
    }
    return { label: 'Running', tone: 'good' as ServiceStatusTone }
  }

  if (['exited', 'dead', 'stopped'].includes(normalizedState)) {
    return { label: 'Stopped', tone: 'stopped' as ServiceStatusTone }
  }

  if (normalizedState === 'restarting') {
    return { label: 'Restarting', tone: 'warning' as ServiceStatusTone }
  }
  if (normalizedState === 'paused') {
    return { label: 'Paused', tone: 'warning' as ServiceStatusTone }
  }

  return { label: normalizedState.replace(/_/g, ' '), tone: 'muted' as ServiceStatusTone }
}

const getContainerMeta = (container?: DockerContainerStatus) => {
  if (!container) return []
  const parts: string[] = []
  if (container.state) parts.push(`State: ${container.state}`)
  if (container.status) parts.push(`Status: ${container.status}`)
  return parts
}

type NetworkSummary = {
  totalRx: number
  totalTx: number
  interfaceCount: number
}

const summarizeNetwork = (network?: Record<string, StatusTransfer>): NetworkSummary | null => {
  if (!network) return null
  let totalRx = 0
  let totalTx = 0
  let interfaceCount = 0
  Object.values(network).forEach((stats) => {
    interfaceCount += 1
    totalRx += typeof stats?.rx_bytes === 'number' ? stats.rx_bytes : 0
    totalTx += typeof stats?.tx_bytes === 'number' ? stats.tx_bytes : 0
  })
  return { totalRx, totalTx, interfaceCount }
}

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

const formatStatusValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '[object Object]') return ''
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return ''
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

const cardClassName = 'rounded-2xl border border-border/60 bg-background/90 p-5 shadow-sm'

const fieldErrorClass = 'border-destructive/60 focus-visible:ring-destructive'

const SERVER_MANAGEMENT_TITLE = 'Server Management | KooyaHQ'
const SERVER_MANAGEMENT_DESCRIPTION = 'Monitor servers, projects, and health.'

const setMetaByName = (name: string, content: string) => {
  if (typeof document === 'undefined') return
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

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
  const [projectsLoading, setProjectsLoading] = useState(true)
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

  const [pendingAction, setPendingAction] = useState<{ action: Action; server: Server; service: Service } | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [actionRunError, setActionRunError] = useState<string | null>(null)
  const [actionRunPendingId, setActionRunPendingId] = useState<string | null>(null)
  const [cliOutput, setCliOutput] = useState<CliOutput | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusRefreshing, setStatusRefreshing] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusData, setStatusData] = useState<Record<string, string>>({})
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
  const canActionNormal = can(PERMISSIONS.SERVER_MANAGEMENT_ACTION_NORMAL)
  const canActionWarning = can(PERMISSIONS.SERVER_MANAGEMENT_ACTION_WARNING)
  const canActionDangerous = can(PERMISSIONS.SERVER_MANAGEMENT_ACTION_DANGEROUS)
  const canRunDangerous = canManage || canElevatedUse || canActionDangerous
  const canRunWarning = canRunDangerous || canActionWarning
  const canRunNormal = canRunWarning || canActionNormal || canUse

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
  const networkGroups = useMemo(
    () => groupNetworkInterfaces(instanceStatus?.network),
    [instanceStatus?.network]
  )
  const networkSummary = useMemo(
    () => summarizeNetwork(instanceStatus?.network),
    [instanceStatus?.network]
  )
  const loadSeries = useMemo(() => {
    const values = [
      { label: '1m', value: instanceStatus?.cpu?.loadavg_1m },
      { label: '5m', value: instanceStatus?.cpu?.loadavg_5m },
      { label: '15m', value: instanceStatus?.cpu?.loadavg_15m },
    ]
    const max = Math.max(
      0,
      ...values.map((entry) => (typeof entry.value === 'number' && Number.isFinite(entry.value) ? entry.value : 0))
    )
    return { values, max }
  }, [instanceStatus?.cpu?.loadavg_1m, instanceStatus?.cpu?.loadavg_5m, instanceStatus?.cpu?.loadavg_15m])

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

  useEffect(() => {
    if (typeof document === 'undefined') return

    let title = SERVER_MANAGEMENT_TITLE
    let description = SERVER_MANAGEMENT_DESCRIPTION

    if (selectedProject && selectedServer) {
      title = `${selectedServer.name} | ${selectedProject.name} | KooyaHQ`
      description = selectedServer.summary?.trim() || selectedProject.description?.trim() || description
    } else if (selectedProject) {
      title = `${selectedProject.name} | Server Management | KooyaHQ`
      description = selectedProject.description?.trim() || description
    }

    document.title = title
    setMetaByName('description', description)
  }, [selectedProject, selectedServer])

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
    setServerForm({ ...emptyServerForm, services: [createService()] })
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
      services: server.services.map((service) => ({
        id: createId('service'),
        name: service.name,
        serviceName: service.serviceName,
        actions: service.actions.map((action) => ({
          id: action.id,
          name: action.name,
          description: action.description,
          command: action.command,
          risk: getActionRisk(action as { risk?: ActionRisk; dangerous?: boolean }),
        })),
      })),
    })
    setServerFormErrors({})
    setServerFormError(null)
    setServerModalOpen(true)
  }

  const addService = () => {
    setServerForm((prev) => ({
      ...prev,
      services: [...prev.services, createService()],
    }))
  }

  const removeService = (serviceId: string) => {
    setServerForm((prev) => ({
      ...prev,
      services: prev.services.filter((service) => service.id !== serviceId),
    }))
  }

  const updateService = (serviceId: string, updates: Partial<ServiceFormState>) => {
    setServerForm((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.id === serviceId ? { ...service, ...updates } : service
      ),
    }))
  }

  const addServiceAction = (serviceId: string) => {
    setServerForm((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.id === serviceId
          ? { ...service, actions: [...service.actions, createAction()] }
          : service
      ),
    }))
  }

  const updateServiceAction = (serviceId: string, actionId: string, updates: Partial<Action>) => {
    setServerForm((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              actions: service.actions.map((action) =>
                action.id === actionId ? { ...action, ...updates } : action
              ),
            }
          : service
      ),
    }))
  }

  const removeServiceAction = (serviceId: string, actionId: string) => {
    setServerForm((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.id === serviceId
          ? { ...service, actions: service.actions.filter((action) => action.id !== actionId) }
          : service
      ),
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

    const serviceErrors: Record<string, ServiceFormErrors> = {}
    serverForm.services.forEach((service) => {
      const serviceName = service.name.trim()
      const currentServiceErrors: ServiceFormErrors = {
        name: serviceName ? undefined : 'Required',
      }

      const actionErrors: Record<string, ActionErrors> = {}
      service.actions.forEach((action) => {
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
        currentServiceErrors.actions = actionErrors
      }

      if (Object.values(currentServiceErrors).some(Boolean)) {
        serviceErrors[service.id] = currentServiceErrors
      }
    })

    if (Object.keys(serviceErrors).length > 0) {
      errors.services = serviceErrors
    }

    if (errors.name || errors.summary || errors.host || errors.services) {
      setServerFormErrors(errors)
      setServerFormError(null)
      return
    }

    setServerFormErrors({})
    setServerFormError(null)
    setServerSaving(true)

    const cleanedServices = serverForm.services.map((service) => ({
      name: service.name.trim(),
      serviceName: service.serviceName.trim(),
      actions: service.actions.map((action) => ({
        id: action.id,
        risk: getActionRisk(action),
        name: action.name.trim(),
        description: action.description.trim(),
        command: action.command.trim(),
      })),
    }))

    const payload = {
      name: trimmed.name,
      summary: trimmed.summary,
      host: trimmed.host,
      port: trimmed.port || undefined,
      user: trimmed.user || undefined,
      statusCommand: trimmed.statusCommand || undefined,
      appDirectory: trimmed.appDirectory || undefined,
      services: cleanedServices,
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

  const isActionRunnable = (action: Action) => {
    const risk = getActionRisk(action)
    if (risk === 'dangerous') return canRunDangerous
    if (risk === 'warning') return canRunWarning
    return canRunNormal
  }

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

  useEffect(() => {
    if (!selectedServer?.id || !canUse) {
      setStatusLoading(false)
      setStatusRefreshing(false)
      setStatusError(null)
      setStatusData({})
      setStatusPayload(null)
      return
    }

    setStatusError(null)
    setStatusData({})
    setStatusPayload(null)
    void fetchServerStatus(selectedServer.id, { initial: true })

    const intervalId = window.setInterval(() => {
      void fetchServerStatus(selectedServer.id)
    }, 2000)

    return () => {
      window.clearInterval(intervalId)
      statusPollInFlightRef.current = false
    }
  }, [selectedServer?.id, canUse, fetchServerStatus])

  const openConfirmAction = (action: Action, server: Server, service: Service) => {
    if (!isActionRunnable(action)) return
    setPendingAction({ action, server, service })
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

  const pendingActionRisk = pendingAction ? getActionRisk(pendingAction.action) : 'normal'
  const confirmEnabled =
    (!pendingAction ||
      !requiresConfirm(pendingActionRisk) ||
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
    const allActions = server.services.flatMap((service) => service.actions)
    const runnableActions = allActions.filter((action) => action.command?.trim()).length
    const warningActions = allActions.filter((action) => getActionRisk(action) === 'warning').length
    const dangerousActions = allActions.filter((action) => getActionRisk(action) === 'dangerous').length
    const showServicesSkeleton = statusLoading && server.services.length > 0
    const servicesSkeletonRows = Math.min(server.services.length, 3)
    const memoryPercent = getUsagePercent(
      instanceStatus?.mem?.used_bytes,
      instanceStatus?.mem?.total_bytes
    )
    const storagePercent = getUsagePercent(
      instanceStatus?.storage_root?.used_bytes,
      instanceStatus?.storage_root?.total_bytes
    )
    const cpuLoadPeak = loadSeries.max > 0 ? loadSeries.max : null
    const cpuLoadPercent = getRelativePercent(instanceStatus?.cpu?.loadavg_1m ?? null, cpuLoadPeak)
    const networkTotal =
      typeof networkSummary?.totalRx === 'number' && typeof networkSummary?.totalTx === 'number'
        ? networkSummary.totalRx + networkSummary.totalTx
        : null
    const networkRxPercent = getRelativePercent(networkSummary?.totalRx ?? null, networkTotal)
    const networkTxPercent = getRelativePercent(networkSummary?.totalTx ?? null, networkTotal)
    const trafficMax = server.services.reduce(
      (acc, service) => {
        const container = getContainerForService(service, dockerStatus?.containers)
        const netTotal = getTransferTotal(container?.net)
        return {
          maxNet: Math.max(acc.maxNet, netTotal ?? 0),
        }
      },
      { maxNet: 0 }
    )

    const renderServiceActionsMenu = (
      service: Service,
      options: { compact?: boolean; align?: 'start' | 'center' | 'end' } = {}
    ) => {
      const { compact = false, align = 'end' } = options
      if (service.actions.length === 0) {
        return <span className="text-xs text-muted-foreground">{compact ? '—' : 'No actions'}</span>
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size={compact ? 'icon' : 'sm'}
              className={cn(
                'rounded-none',
                compact ? 'h-8 w-8 p-0' : 'h-8 px-3 text-xs uppercase tracking-[0.2em]'
              )}
              aria-label={compact ? `Manage actions for ${service.name}` : undefined}
            >
              {!compact && <span>Manage</span>}
              <MoreHorizontal className={cn('h-4 w-4', !compact && 'ml-2')} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={align}
            side="bottom"
            sideOffset={8}
            collisionPadding={12}
            className="w-[min(28rem,90vw)] rounded-none border-border/80 bg-popover p-2 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Actions</span>
              <span className="text-xs text-muted-foreground">{service.actions.length} total</span>
            </div>
            <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {service.actions.map((action) => {
                const actionRisk = getActionRisk(action)
                const isRunnable = isActionRunnable(action)
                const isPending = actionRunPendingId === action.id
                return (
                  <DropdownMenuItem
                    key={action.id}
                    onSelect={() => openConfirmAction(action, server, service)}
                    disabled={!isRunnable || isPending}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-none border border-border/60 bg-background/95 p-3 text-left cursor-pointer focus:bg-muted/30',
                      'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
                      actionRisk === 'dangerous' && 'border-destructive/40 bg-destructive/5',
                      actionRisk === 'warning' && 'border-amber-500/40 bg-amber-500/5'
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{action.name || 'Untitled action'}</span>
                          {actionRisk !== 'normal' && (
                            <Badge
                              variant={actionRisk === 'dangerous' ? 'destructive' : 'outline'}
                              className={cn(
                                'rounded-none text-[11px] uppercase tracking-[0.2em]',
                                actionRisk === 'warning' && ACTION_RISK_BADGE_CLASS.warning
                              )}
                            >
                              {ACTION_RISK_LABELS[actionRisk]}
                            </Badge>
                          )}
                          {!isRunnable && (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                              <Lock className="h-3 w-3" />
                              No access
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {action.description?.trim() ? action.description : 'No description provided.'}
                        </p>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {isPending ? 'Running' : 'Run'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

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
                <p className="text-sm font-medium font-mono tabular-nums">{server.host}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
          <div className="border border-border/60 bg-background/90 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Connection</p>
              <p className="text-sm font-semibold">Access details</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Host</span>
                <span className="font-medium font-mono tabular-nums text-right break-all">
                  {server.host || '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-border/60 bg-background/90 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Automation</p>
              <p className="text-sm font-semibold">{allActions.length} actions configured</p>
              <p className="text-xs text-muted-foreground">
                Warning actions open a confirmation modal. Dangerous actions require typing CONFIRM.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Runnable actions</span>
                <span className="font-medium font-mono tabular-nums text-right">{runnableActions}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Warning actions</span>
                <span className="font-medium font-mono tabular-nums text-right">{warningActions}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Dangerous actions</span>
                <span className="font-medium font-mono tabular-nums text-right">{dangerousActions}</span>
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Overall Status</h2>
              <p className="text-sm text-muted-foreground">
                CPU, memory, storage, and network for this server.
              </p>
            </div>
            {canUse && (
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live (2s)
                </span>
                {statusRefreshing && <span>Updating...</span>}
              </div>
            )}
          </div>

          {!canUse && (
            <div className="border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
              Status updates require server management access.
            </div>
          )}
          {statusError && (
            <div className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {statusError}
            </div>
          )}
          {statusPayload?.timestamp && (
            <p className="text-xs text-muted-foreground font-mono tabular-nums">
              Last updated: {statusPayload.timestamp}
            </p>
          )}
          {statusLoading && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`status-skeleton-${index}`} className="border border-border/60 bg-background/90 p-3">
                  <Skeleton className="h-3 w-20 rounded-none" />
                  <Skeleton className="mt-3 h-6 w-28 rounded-none" />
                  <Skeleton className="mt-2 h-3 w-32 rounded-none" />
                  <Skeleton className="mt-2 h-1.5 w-full rounded-none" />
                </div>
              ))}
            </div>
          )}

          {instanceStatus && (
            <section className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="border border-border/60 bg-background/90 p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">CPU Load</p>
                  <p className="text-lg font-semibold font-mono tabular-nums">
                    {formatLoadAvg(instanceStatus.cpu?.loadavg_1m)} /{' '}
                    {formatLoadAvg(instanceStatus.cpu?.loadavg_5m)} /{' '}
                    {formatLoadAvg(instanceStatus.cpu?.loadavg_15m)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {formatLoadAvg(instanceStatus.cpu?.loadavg_1m)} /{' '}
                    {cpuLoadPeak !== null ? formatLoadAvg(cpuLoadPeak) : '—'}{' '}
                    {cpuLoadPercent !== null ? `(${formatPercentShort(cpuLoadPercent)})` : ''}
                  </p>
                  <div className="space-y-1">
                    {loadSeries.values.map((entry) => {
                      const loadPercent = getLoadBarPercent(entry.value, loadSeries.max)
                      return (
                        <div key={entry.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-6 font-mono tabular-nums">{entry.label}</span>
                          <div className="flex-1">{renderMiniBar(loadPercent, getUsageTone(loadPercent))}</div>
                          <span className="w-10 text-right font-mono tabular-nums">
                            {formatLoadAvg(entry.value)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="border border-border/60 bg-background/90 p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Memory</p>
                  <p className="text-lg font-semibold font-mono tabular-nums">
                    {formatPercentShort(memoryPercent)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {formatBytes(instanceStatus.mem?.used_bytes)} / {formatBytes(instanceStatus.mem?.total_bytes)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {formatBytes(instanceStatus.mem?.available_bytes)} free
                  </p>
                  {renderPercentBar(memoryPercent, getUsageTone(memoryPercent))}
                </div>
                <div className="border border-border/60 bg-background/90 p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Storage</p>
                  <p className="text-lg font-semibold font-mono tabular-nums">
                    {formatPercentShort(storagePercent)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {formatBytes(instanceStatus.storage_root?.used_bytes)} /{' '}
                    {formatBytes(instanceStatus.storage_root?.total_bytes)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {formatBytes(instanceStatus.storage_root?.available_bytes)} free
                  </p>
                  {renderPercentBar(storagePercent, getUsageTone(storagePercent))}
                </div>
                <div className="border border-border/60 bg-background/90 p-3 space-y-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Network</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-mono tabular-nums text-emerald-700">
                        <ArrowDownRight className="h-4 w-4" />
                        {formatBytes(networkSummary?.totalRx)}
                      </span>
                      <span className="text-xs text-muted-foreground">RX</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-mono tabular-nums text-sky-700">
                        <ArrowUpRight className="h-4 w-4" />
                        {formatBytes(networkSummary?.totalTx)}
                      </span>
                      <span className="text-xs text-muted-foreground">TX</span>
                    </div>
                  </div>
                  {networkTotal !== null && (
                    <p className="text-xs text-muted-foreground font-mono tabular-nums">
                      RX {networkRxPercent !== null ? formatPercentShort(networkRxPercent) : '—'} / TX{' '}
                      {networkTxPercent !== null ? formatPercentShort(networkTxPercent) : '—'}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {networkSummary
                      ? `${networkSummary.interfaceCount} interfaces reported.`
                      : 'Network totals unavailable.'}
                  </p>
                </div>
              </div>

              {networkGroups.length > 0 && (
                <details className="border border-border/60 bg-background/90">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                    Network interfaces
                  </summary>
                  <div className="border-t border-border/60 px-3 py-3">
                    <p className="text-xs text-muted-foreground">Grouped by interface type.</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {networkGroups.map((group) => (
                        <div
                          key={group.label}
                          className="border border-border/60 bg-background/95 p-4 space-y-3"
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
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-mono tabular-nums">
                            <span>RX: {formatBytes(group.totalRx)}</span>
                            <span>TX: {formatBytes(group.totalTx)}</span>
                          </div>
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {group.entries.map(({ name, stats }) => (
                              <div key={name} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="font-medium">{name}</span>
                                <span className="text-muted-foreground font-mono tabular-nums">
                                  {formatBytes(stats?.rx_bytes)} rx / {formatBytes(stats?.tx_bytes)} tx
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </section>
          )}

          {!statusLoading && !statusError && !instanceStatus && Object.keys(statusData).length === 0 && canUse && (
            <p className="text-sm text-muted-foreground">No overall status entries returned.</p>
          )}
          {!statusLoading && !statusError && !instanceStatus && Object.keys(statusData).length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(statusData).map(([key, value]) => (
                <div key={key} className="border border-border/60 bg-background/90 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{key}</p>
                  <p className="text-sm font-semibold font-mono tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Services</h2>
            <p className="text-sm text-muted-foreground">
              Docker status and actions grouped by service.
            </p>
          </div>
          {dockerStatus?.compose_ps_error && (
            <div className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {dockerStatus.compose_ps_error}
            </div>
          )}

          {showServicesSkeleton && (
            <>
              <div className="hidden lg:block border border-border/60 bg-background/90">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[56px]" />
                      <col className="w-[260px]" />
                      <col className="w-[150px]" />
                      <col className="w-[150px]" />
                      <col className="w-[150px]" />
                      <col className="w-[150px]" />
                      <col className="w-[100px]" />
                    </colgroup>
                    <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="border-l border-border/60 px-3 py-3 text-center font-semibold first:border-l-0">
                          <span className="sr-only">Status</span>
                        </th>
                        <th className="border-l border-border/60 px-4 py-3 text-left font-semibold">Service</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">CPU</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Memory</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Net I/O</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">
                          Storage I/O
                        </th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {Array.from({ length: servicesSkeletonRows }).map((_, index) => (
                        <tr key={`service-skeleton-${index}`} className="align-top">
                          <td className="border-l border-border/60 px-3 py-4 align-top first:border-l-0">
                            <div className="flex items-center justify-center">
                              <Skeleton className="h-2 w-2 rounded-none" />
                            </div>
                          </td>
                          <td className="border-l border-border/60 px-4 py-4 align-top">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32 rounded-none" />
                              <Skeleton className="h-3 w-24 rounded-none" />
                            </div>
                          </td>
                          <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                            <Skeleton className="ml-auto h-4 w-16 rounded-none" />
                            <Skeleton className="mt-2 h-1.5 w-full rounded-none" />
                          </td>
                          <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                            <Skeleton className="ml-auto h-4 w-20 rounded-none" />
                            <Skeleton className="mt-2 h-1.5 w-full rounded-none" />
                          </td>
                          <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                            <div className="flex flex-col items-end gap-1">
                              <Skeleton className="ml-auto h-4 w-24 rounded-none" />
                              <Skeleton className="h-1.5 w-full rounded-none" />
                            </div>
                          </td>
                          <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                            <div className="flex flex-col items-end gap-1">
                              <Skeleton className="ml-auto h-4 w-24 rounded-none" />
                              <Skeleton className="h-1.5 w-full rounded-none" />
                            </div>
                          </td>
                          <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                            <Skeleton className="ml-auto h-8 w-8 rounded-none" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-3 lg:hidden">
                {Array.from({ length: servicesSkeletonRows }).map((_, index) => (
                  <div key={`service-skeleton-card-${index}`} className="border border-border/60 bg-background/90 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32 rounded-none" />
                      <Skeleton className="h-3 w-16 rounded-none" />
                    </div>
                    <Skeleton className="h-3 w-24 rounded-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16 rounded-none" />
                        <Skeleton className="h-4 w-20 rounded-none" />
                        <Skeleton className="h-1.5 w-full rounded-none" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16 rounded-none" />
                        <Skeleton className="h-4 w-20 rounded-none" />
                        <Skeleton className="h-1.5 w-full rounded-none" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-16 rounded-none" />
                      <Skeleton className="h-3 w-24 rounded-none" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20 rounded-none" />
                      <Skeleton className="h-3 w-24 rounded-none" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-28 rounded-none" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!showServicesSkeleton && server.services.length > 0 && (
            <>
              <div className="hidden lg:block border border-border/60 bg-background/90">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[56px]" />
                      <col className="w-[260px]" />
                      <col className="w-[150px]" />
                      <col className="w-[150px]" />
                      <col className="w-[150px]" />
                      <col className="w-[150px]" />
                      <col className="w-[100px]" />
                    </colgroup>
                    <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="border-l border-border/60 px-3 py-3 text-center font-semibold first:border-l-0">
                          <span className="sr-only">Status</span>
                        </th>
                        <th className="border-l border-border/60 px-4 py-3 text-left font-semibold">Service</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">CPU</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Memory</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Net I/O</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">
                          Storage I/O
                        </th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {server.services.map((service) => {
                        const container = getContainerForService(service, dockerStatus?.containers)
                        const state = container?.state?.trim()
                        const health = container?.health?.trim()
                        const cpuPercent = container ? getContainerCpuPercent(container) : null
                        const cpuBarPercent =
                          cpuPercent !== null && cpuPercent > 0 && cpuPercent < 1 ? 1 : cpuPercent
                        const memPercent = container ? getContainerMemPercent(container.mem) : null
                        const netTotal = getTransferTotal(container?.net)
                        const { read: blockRead, write: blockWrite } = getBlockReadWrite(container?.block)
                        const netBarPercent = getRelativePercent(netTotal, trafficMax.maxNet)
                        const blockSplit = getSplitPercents(blockRead, blockWrite)
                        const statusSummary = getServiceStatusSummary(state, health)
                        const statusStyles = SERVICE_STATUS_STYLES[statusSummary.tone]
                        const containerMeta = getContainerMeta(container)
                        return (
                          <tr
                            key={service.serviceName || service.name}
                            className="group align-top transition-colors hover:bg-muted/30"
                          >
                            <td className="border-l border-border/60 px-3 py-4 align-top text-center first:border-l-0">
                              <div className="relative flex h-6 items-center justify-center">
                                <span className={cn('h-2.5 w-2.5 rounded-full', statusStyles.dot)} />
                                <span className="sr-only">{statusSummary.label}</span>
                              </div>
                            </td>
                            <td className="border-l border-border/60 px-4 py-4 align-top">
                              <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{service.name}</h3>
                                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                                  {service.serviceName || '—'}
                                </p>
                                {containerMeta.length > 0 && (
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground leading-tight">
                                    {containerMeta.map((entry) => (
                                      <span key={entry}>{entry}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-medium font-mono tabular-nums">
                                  {container ? formatContainerCpu(container) : '—'}
                                </span>
                                {renderFlatBar(cpuBarPercent, getUsageTone(cpuBarPercent))}
                              </div>
                            </td>
                            <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] font-semibold font-mono tabular-nums whitespace-nowrap leading-tight">
                                  {container ? formatContainerMemPair(container.mem) : '—'}
                                </span>
                                {renderFlatBar(memPercent, getUsageTone(memPercent))}
                                <span className="text-[10px] text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                                  {memPercent !== null ? formatPercentShort(memPercent) : '—'}
                                </span>
                              </div>
                            </td>
                            <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] font-semibold font-mono tabular-nums whitespace-nowrap leading-tight">
                                  {container ? formatContainerNet(container.net) : '—'}
                                </span>
                                {renderFlatBar(netBarPercent, 'bg-sky-500/70')}
                                {netBarPercent !== null && (
                                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                                    {formatPercentShort(netBarPercent)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] font-semibold font-mono tabular-nums whitespace-nowrap leading-tight">
                                  {blockRead !== null || blockWrite !== null
                                    ? `R ${formatBytes(blockRead ?? undefined)} / W ${formatBytes(blockWrite ?? undefined)}`
                                    : '—'}
                                </span>
                                {renderSplitBar(blockSplit.read, blockSplit.write)}
                              </div>
                            </td>
                            <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                              <div className="flex justify-end">{renderServiceActionsMenu(service, { compact: true })}</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-3 lg:hidden">
                {server.services.map((service) => {
                  const container = getContainerForService(service, dockerStatus?.containers)
                  const state = container?.state?.trim()
                  const health = container?.health?.trim()
                  const cpuPercent = container ? getContainerCpuPercent(container) : null
                  const cpuBarPercent =
                    cpuPercent !== null && cpuPercent > 0 && cpuPercent < 1 ? 1 : cpuPercent
                  const memPercent = container ? getContainerMemPercent(container.mem) : null
                  const netTotal = getTransferTotal(container?.net)
                  const { read: blockRead, write: blockWrite } = getBlockReadWrite(container?.block)
                  const netBarPercent = getRelativePercent(netTotal, trafficMax.maxNet)
                  const blockSplit = getSplitPercents(blockRead, blockWrite)
                  const statusSummary = getServiceStatusSummary(state, health)
                  const statusStyles = SERVICE_STATUS_STYLES[statusSummary.tone]
                  const containerMeta = getContainerMeta(container)
                  return (
                    <div
                      key={service.serviceName || service.name}
                      className="border border-border/60 bg-background/90 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{service.name}</p>
                          <p className="text-xs text-muted-foreground font-mono tabular-nums">
                            {service.serviceName || '—'}
                          </p>
                          {containerMeta.length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground leading-tight">
                              {containerMeta.map((entry) => (
                                <span key={entry}>{entry}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                          <span className={cn('h-2 w-2 rounded-full', statusStyles.dot)} />
                          <span className={cn('font-semibold', statusStyles.text)}>
                            {statusSummary.label}
                          </span>
                        </div>
                      </div>
                      {!container && <p className="text-xs text-muted-foreground">No container data.</p>}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">CPU</p>
                          <p className="text-sm font-medium font-mono tabular-nums">
                            {container ? formatContainerCpu(container) : '—'}
                          </p>
                          {renderFlatBar(cpuBarPercent, getUsageTone(cpuBarPercent))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Memory</p>
                          <p className="text-[11px] font-semibold font-mono tabular-nums whitespace-nowrap leading-tight">
                            {container ? formatContainerMemPair(container.mem) : '—'}
                          </p>
                          {renderFlatBar(memPercent, getUsageTone(memPercent))}
                          <p className="text-[10px] text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                            {memPercent !== null ? formatPercentShort(memPercent) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span className="uppercase tracking-[0.2em]">Net I/O</span>
                          <span className="text-[11px] font-mono tabular-nums whitespace-nowrap leading-tight">
                            {container ? formatContainerNet(container.net) : '—'}
                          </span>
                        </div>
                        {renderFlatBar(netBarPercent, 'bg-sky-500/70')}
                        {netBarPercent !== null && (
                          <span className="text-[10px] text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                            {formatPercentShort(netBarPercent)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span className="uppercase tracking-[0.2em]">Storage I/O</span>
                          <span className="text-[11px] font-mono tabular-nums whitespace-nowrap leading-tight">
                            {blockRead !== null || blockWrite !== null
                              ? `R ${formatBytes(blockRead ?? undefined)} / W ${formatBytes(blockWrite ?? undefined)}`
                              : '—'}
                          </span>
                        </div>
                        {renderSplitBar(blockSplit.read, blockSplit.write)}
                      </div>
                      <div className="flex justify-end">{renderServiceActionsMenu(service)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {!showServicesSkeleton && server.services.length === 0 && (
            <div className="border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              No services configured yet.
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
                    Services
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Map services to docker compose names and attach actions to each service.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={addService}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Button>
              </div>

              <div className="space-y-4">
                {serverForm.services.map((service) => {
                  const serviceError = serverFormErrors.services?.[service.id]
                  return (
                    <div
                      key={service.id}
                      className="rounded-2xl border border-border/60 bg-background/90 p-4 space-y-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="grid gap-4 sm:grid-cols-2 flex-1">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Service Name</label>
                            <Input
                              value={service.name}
                              onChange={(e) => updateService(service.id, { name: e.target.value })}
                              placeholder="API"
                              className={cn(serviceError?.name && fieldErrorClass)}
                            />
                            {serviceError?.name && (
                              <p className="text-xs text-destructive">{serviceError.name}</p>
                            )}
                          </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Compose Service Name (optional)</label>
                            <p className="text-xs text-muted-foreground">
                              Matches the docker compose service for status mapping.
                            </p>
                          </div>
                          <Input
                            value={service.serviceName}
                            onChange={(e) => updateService(service.id, { serviceName: e.target.value })}
                            placeholder="api"
                          />
                        </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeService(service.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">Actions</p>
                          <p className="text-xs text-muted-foreground">
                            Action commands stay hidden in the UI, except inside this configuration form.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addServiceAction(service.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Action
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {service.actions.map((action) => {
                          const actionError = serviceError?.actions?.[action.id]
                          const actionRisk = getActionRisk(action)
                          return (
                            <div
                              key={action.id}
                              className="rounded-2xl border border-border/60 bg-background/95 p-4 space-y-3"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2 flex-1">
                                  <label className="text-sm font-medium">Action Name</label>
                                  <Input
                                    value={action.name}
                                    onChange={(e) =>
                                      updateServiceAction(service.id, action.id, { name: e.target.value })
                                    }
                                    placeholder="Deploy"
                                    className={cn(actionError?.name && fieldErrorClass)}
                                  />
                                  {actionError?.name && (
                                    <p className="text-xs text-destructive">{actionError.name}</p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-3 sm:items-end">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Risk Level</p>
                                    <RadioGroup
                                      value={actionRisk}
                                      onValueChange={(value) =>
                                        updateServiceAction(service.id, action.id, { risk: value as ActionRisk })
                                      }
                                      className="flex flex-wrap gap-3"
                                    >
                                      {(['normal', 'warning', 'dangerous'] as ActionRisk[]).map((value) => (
                                        <label key={value} className="flex items-center gap-2">
                                          <RadioGroupItem value={value} />
                                          <span className="text-sm">{ACTION_RISK_LABELS[value]}</span>
                                        </label>
                                      ))}
                                    </RadioGroup>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => removeServiceAction(service.id, action.id)}
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
                                    onChange={(e) =>
                                      updateServiceAction(service.id, action.id, { description: e.target.value })
                                    }
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
                                    onChange={(e) =>
                                      updateServiceAction(service.id, action.id, { command: e.target.value })
                                    }
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

      <Modal open={Boolean(pendingAction)} onClose={closeConfirmAction} maxWidth="lg">
        {pendingAction && (
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {pendingActionRisk !== 'normal' && (
                      <AlertTriangle
                        className={cn(
                          'h-5 w-5',
                          pendingActionRisk === 'dangerous' ? 'text-destructive' : 'text-amber-600'
                        )}
                      />
                    )}
                    <h2 className="text-lg font-semibold">Confirm Action</h2>
                    {pendingActionRisk !== 'normal' && (
                      <Badge
                        variant={pendingActionRisk === 'dangerous' ? 'destructive' : 'outline'}
                        className={cn(
                          'text-xs',
                          pendingActionRisk === 'warning' && ACTION_RISK_BADGE_CLASS.warning
                        )}
                      >
                        {ACTION_RISK_LABELS[pendingActionRisk]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pendingAction.action.name} - {pendingAction.service.name} - {pendingAction.server.name}
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

              {pendingActionRisk === 'warning' && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800">
                  Warning action. Review the details before running.
                </div>
              )}

              {pendingActionRisk === 'dangerous' && (
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
                  pendingActionRisk === 'dangerous' && 'bg-destructive text-destructive-foreground',
                  pendingActionRisk === 'warning' && 'bg-amber-500/20 text-amber-800 border-amber-500/40'
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
