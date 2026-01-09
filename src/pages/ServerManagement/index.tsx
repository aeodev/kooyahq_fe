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
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
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

type StatusUpdatePayload = {
  serverId?: string
  status?: Record<string, unknown>
  rawOutput?: string
}

type StatusErrorPayload = {
  serverId?: string
  message?: string
}

// instancectl format types
type StatusMemory = {
  total_bytes?: number
  used_bytes?: number
  free_bytes?: number
}

type StatusCpuMetrics = {
  total_percent?: number
  used_percent?: number
  free_percent?: number
  iowait_percent?: number
}

type StatusCpu = {
  total_percent?: number
  used_percent?: number
  free_percent?: number
  cores?: Record<string, number>
  load_avg?: {
    '1m_percent'?: number
    '5m_percent'?: number
    '15m_percent'?: number
  }
  iowait_percent?: number
  // Normalized metrics wrapper for UI access
  metrics?: StatusCpuMetrics
}

type StatusNetworkSpeed = {
  rx_bytes?: number
  tx_bytes?: number
}

type StatusNetwork = {
  rx_total_bytes?: number
  tx_total_bytes?: number
  rx_total_errors?: number
  tx_total_errors?: number
  rx_total_drops?: number
  tx_total_drops?: number
  speed?: StatusNetworkSpeed
  interfaces?: Record<string, { rx_bytes?: number; tx_bytes?: number }>
}

type StatusStorageSpeed = {
  read_bytes?: number
  write_bytes?: number
}

type StatusStorage = {
  total_bytes?: number
  used_bytes?: number
  free_bytes?: number
  read_total_bytes?: number
  write_total_bytes?: number
  speed?: StatusStorageSpeed
}

type StatusTemperature = {
  zone?: string
  label?: string
  temperature_celsius?: number
}

type StatusFileDescriptors = {
  allocated?: number
  max?: number
}

type StatusGpu = {
  index?: number
  name?: string
  memory?: StatusMemory
  utilization?: { used_percent?: number; free_percent?: number }
  temperature_celsius?: number
  fan_percent?: number
  power_watts?: number
  power_limit_watts?: number
}

type StatusContainerHealth = 'starting' | 'running' | 'stopped' | 'restarting' | 'exited' | 'dead' | 'paused'

// For internal display normalization
type StatusTransfer = {
  rx_bytes?: number
  tx_bytes?: number
  in_bps?: number
  out_bps?: number
  raw?: string
}

type StatusStorageIo = {
  read_bytes?: number
  write_bytes?: number
  read_bps?: number
  write_bps?: number
}

type TrendSeriesBlock = {
  cpu: number[]
  memory: number[]
  netIn: number[]
  netOut: number[]
  storageRead: number[]
  storageWrite: number[]
}

type TrendSeriesState = {
  instance: TrendSeriesBlock
  services: Record<string, TrendSeriesBlock>
}

type TrendSeriesUpdate = {
  cpu?: number | null
  memory?: number | null
  netIn?: number | null
  netOut?: number | null
  storageRead?: number | null
  storageWrite?: number | null
}

type SparklineSeries = {
  data: number[]
  strokeClass: string
}

type SparklineDotProps = {
  cx?: number
  cy?: number
  index?: number
}

// Container storage block type for normalized data
type ContainerStorageBlock = {
  read_total_bytes?: number
  write_total_bytes?: number
  speed?: { read_bytes?: number; write_bytes?: number }
}

// Container format from instancectl
type DockerContainerStatus = {
  id?: string
  name?: string
  health?: StatusContainerHealth
  status?: string
  cpu?: StatusCpu
  memory?: StatusMemory
  network?: {
    rx_total_bytes?: number
    tx_total_bytes?: number
    speed?: StatusNetworkSpeed
  }
  storage?: {
    read_total_bytes?: number
    write_total_bytes?: number
    speed?: StatusStorageSpeed
  }
  // Normalized fields for UI compatibility
  state?: string
  mem?: StatusMemory
  net?: StatusTransfer
  block?: ContainerStorageBlock
}

// Instance format from instancectl
type StatusInstance = {
  hostname?: string
  status?: 'running' | 'down'
  uptime_seconds?: number
  process_count?: number
  memory?: StatusMemory
  swap?: StatusMemory
  cpu?: StatusCpu
  network?: StatusNetwork
  storage?: StatusStorage
  temperature?: StatusTemperature[]
  file_descriptors?: StatusFileDescriptors
  gpu?: StatusGpu[]
  // Normalized fields for display
  mem?: {
    total_bytes?: number
    used_bytes?: number
    available_bytes?: number
  }
  network_speed?: {
    in_bps?: number
    out_bps?: number
  }
  storage_root?: {
    total_bytes?: number
    used_bytes?: number
    available_bytes?: number
  }
  storage_io?: StatusStorageIo
  storage_speed?: StatusStorageIo
}

type StatusPayload = {
  timestamp?: string
  health_status?: string
  instance?: StatusInstance
  docker?: {
    compose_errors?: string | null
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

const TREND_POINTS = 60

const createTrendSeriesBlock = (): TrendSeriesBlock => ({
  cpu: [],
  memory: [],
  netIn: [],
  netOut: [],
  storageRead: [],
  storageWrite: [],
})

const emptyTrendSeriesBlock = createTrendSeriesBlock()

const appendTrendPoint = (series: number[], value: number | null, maxPoints = TREND_POINTS) => {
  if (value === null || !Number.isFinite(value)) {
    if (series.length === 0) return series
    value = series[series.length - 1]
  }
  const next = [...series, value]
  if (next.length > maxPoints) {
    next.splice(0, next.length - maxPoints)
  }
  return next
}

const updateTrendSeriesBlock = (block: TrendSeriesBlock, update: TrendSeriesUpdate) => ({
  cpu: appendTrendPoint(block.cpu, update.cpu ?? null),
  memory: appendTrendPoint(block.memory, update.memory ?? null),
  netIn: appendTrendPoint(block.netIn, update.netIn ?? null),
  netOut: appendTrendPoint(block.netOut, update.netOut ?? null),
  storageRead: appendTrendPoint(block.storageRead, update.storageRead ?? null),
  storageWrite: appendTrendPoint(block.storageWrite, update.storageWrite ?? null),
})

const getLastValue = (series: number[]) => (series.length > 0 ? series[series.length - 1] : null)

const SparklineChart = ({
  series,
  height = 48,
  className,
}: {
  series: SparklineSeries[]
  height?: number
  className?: string
}) => {
  const hasData = series.some((entry) => entry.data.length > 0)
  if (!hasData) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-[10px] text-gray-400 dark:text-slate-500',
          className
        )}
        style={{ height }}
      >
        No data
      </div>
    )
  }

  const maxLength = TREND_POINTS
  const data = Array.from({ length: maxLength }, (_, index) => {
    const row: Record<string, number | null> = { index }
    series.forEach((entry, seriesIndex) => {
      const trimmed = entry.data.slice(-maxLength)
      const offset = maxLength - trimmed.length
      const value = index < offset ? null : trimmed[index - offset]
      row[`s${seriesIndex}`] = typeof value === 'number' && Number.isFinite(value) ? value : null
    })
    return row
  })
  const lastIndex = data.length - 1
  const renderTailDot = (colorClass: string) => ({ cx, cy, index }: SparklineDotProps) => {
    if (index !== lastIndex || cx === undefined || cy === undefined) return null
    return (
      <circle
        cx={cx}
        cy={cy}
        r={2.6}
        fill="currentColor"
        className={cn(colorClass, 'animate-pulse')}
      />
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <XAxis hide dataKey="index" />
          <YAxis hide domain={['dataMin', 'dataMax']} padding={{ top: 6, bottom: 6 }} />
          {series.map((entry, index) => (
            <Line
              key={`sparkline-${index}`}
              type="monotone"
              dataKey={`s${index}`}
              dot={renderTailDot(entry.strokeClass)}
              activeDot={false}
              stroke="currentColor"
              className={entry.strokeClass}
              strokeWidth={1.6}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const formatUptime = (seconds?: number | null) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return `${days}d ${hours}h`
}

const formatBytes = (value?: number | null) => {
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

const formatBitsPerSecond = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps']
  let rate = Math.abs(value)
  let unitIndex = 0
  while (rate >= 1000 && unitIndex < units.length - 1) {
    rate /= 1000
    unitIndex += 1
  }
  const decimals = rate >= 10 || unitIndex === 0 ? 0 : 1
  const sign = value < 0 ? '-' : ''
  return `${sign}${rate.toFixed(decimals)} ${units[unitIndex]}`
}

const formatBytesPerSecond = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s']
  let rate = Math.abs(value)
  let unitIndex = 0
  while (rate >= 1024 && unitIndex < units.length - 1) {
    rate /= 1024
    unitIndex += 1
  }
  const decimals = rate >= 10 || unitIndex === 0 ? 0 : 1
  const sign = value < 0 ? '-' : ''
  return `${sign}${rate.toFixed(decimals)} ${units[unitIndex]}`
}

const formatPercent = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}%`
}

const formatPercentOne = (value?: number | null) => {
  if (value === null || typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${value.toFixed(1)}%`
}

const formatContainerMemPair = (mem?: StatusMemory) => {
  if (!mem) return '—'
  if (typeof mem.used_bytes === 'number' && typeof mem.total_bytes === 'number') {
    return `${formatBytes(mem.used_bytes)} / ${formatBytes(mem.total_bytes)}`
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

const formatTimestampTime = (value?: string) => {
  if (!value) return '—'
  const match = value.match(/T(\d{2}:\d{2}:\d{2})/)
  return match ? match[1] : value
}

const getUsageTone = (percent: number | null) => {
  if (percent === null) return 'bg-muted-foreground/30'
  if (percent >= 80) return 'bg-rose-500/80 dark:bg-rose-400/80'
  if (percent >= 60) return 'bg-amber-500/80 dark:bg-amber-400/80'
  return 'bg-emerald-500/80 dark:bg-emerald-400/80'
}

const formatContainerCpu = (container: DockerContainerStatus) => {
  if (container.cpu?.used_percent !== undefined) {
    return formatPercent(container.cpu.used_percent)
  }
  return '—'
}

const getContainerCpuPercent = (container: DockerContainerStatus) => {
  if (container.cpu?.used_percent !== undefined && Number.isFinite(container.cpu.used_percent)) {
    return clampPercent(container.cpu.used_percent)
  }
  return null
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
  if (typeof net.rx_bytes === 'number' || typeof net.tx_bytes === 'number') {
    return `IN ${formatBytes(net.rx_bytes)} / OUT ${formatBytes(net.tx_bytes)}`
  }
  return '—'
}

const formatContainerNetSpeed = (net?: StatusTransfer) => {
  if (!net) return '—'
  if (typeof net.in_bps === 'number' || typeof net.out_bps === 'number') {
    return `IN ${formatBitsPerSecond(net.in_bps)} / OUT ${formatBitsPerSecond(net.out_bps)}`
  }
  return '—'
}

const getBlockReadWrite = (block?: ContainerStorageBlock) => {
  if (!block) return { read: null, write: null }
  return {
    read: typeof block.read_total_bytes === 'number' ? block.read_total_bytes : null,
    write: typeof block.write_total_bytes === 'number' ? block.write_total_bytes : null,
  }
}

const getBlockSpeed = (block?: ContainerStorageBlock) => {
  if (!block?.speed) return { read: null, write: null }
  return {
    read: typeof block.speed.read_bytes === 'number' ? block.speed.read_bytes : null,
    write: typeof block.speed.write_bytes === 'number' ? block.speed.write_bytes : null,
  }
}

const getUsagePercent = (used?: number, total?: number) => {
  if (typeof used !== 'number' || typeof total !== 'number' || !Number.isFinite(used) || !Number.isFinite(total)) {
    return null
  }
  if (total <= 0) return null
  return clampPercent((used / total) * 100)
}

const getActivityLabel = (totalBytes: number | null) => {
  if (totalBytes === null) return '—'
  const twoGb = 2 * 1024 * 1024 * 1024
  const tenGb = 10 * 1024 * 1024 * 1024
  if (totalBytes < twoGb) return 'Low'
  if (totalBytes < tenGb) return 'Moderate'
  return 'High'
}

const getSpeedActivityLabel = (bitsPerSecond: number | null) => {
  if (bitsPerSecond === null) return '—'
  const oneMbps = 1_000_000
  const tenMbps = 10_000_000
  if (bitsPerSecond < oneMbps) return 'Low'
  if (bitsPerSecond < tenMbps) return 'Moderate'
  return 'High'
}

const getContainerMemPercent = (mem?: StatusMemory) => {
  if (!mem) return null
  return getUsagePercent(mem.used_bytes, mem.total_bytes)
}

const renderPercentBar = (
  percent: number | null,
  toneClass: string,
  options: { trackClass?: string } = {}
) => {
  if (percent === null) return null
  const trackClass = options.trackClass ?? 'bg-muted/60'
  return (
    <div className={cn('mt-2 h-1.5 w-full', trackClass)}>
      <div className={cn('h-full transition-all', toneClass)} style={{ width: `${percent}%` }} />
    </div>
  )
}

const renderMiniBar = (
  percent: number | null,
  toneClass: string,
  options: { trackClass?: string } = {}
) => {
  if (percent === null) return null
  const trackClass = options.trackClass ?? 'bg-muted/60'
  return (
    <div className={cn('h-1 w-full', trackClass)}>
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

const IO_READ_CLASS = 'bg-sky-500/80 dark:bg-sky-400/80'
const IO_WRITE_CLASS = 'bg-amber-500/80 dark:bg-amber-400/80'

const renderSplitBar = (
  readPercent: number | null,
  writePercent: number | null,
  options: { readClass?: string; writeClass?: string; trackClass?: string } = {}
) => {
  if (readPercent === null && writePercent === null) return null
  const safeRead = Math.max(0, readPercent ?? 0)
  const safeWrite = Math.max(0, writePercent ?? 0)
  if (safeRead === 0 && safeWrite === 0) return null
  const total = safeRead + safeWrite
  const readWidth = total > 0 ? (safeRead / total) * 100 : 0
  const writeWidth = total > 0 ? (safeWrite / total) * 100 : 0
  const hasBoth = readWidth > 0 && writeWidth > 0
  const readClass = options.readClass ?? 'bg-primary'
  const writeClass = options.writeClass ?? 'bg-muted-foreground/40'
  const trackClass = options.trackClass ?? 'bg-muted/60'
  return (
    <div className={cn('mt-1.5 h-1.5 w-full overflow-hidden', trackClass)}>
      <div className={cn('flex h-full w-full', hasBoth && 'gap-px')}>
        <div className={cn('h-full', readClass)} style={{ width: `${readWidth}%` }} />
        <div className={cn('h-full', writeClass)} style={{ width: `${writeWidth}%` }} />
      </div>
    </div>
  )
}

const getCpuCoreEntries = (cores?: Record<string, number>) => {
  if (!cores) return []
  const entries = Object.entries(cores)
    .map(([name, value]) => ({ name, value }))
    .filter((entry) => typeof entry.value === 'number' && Number.isFinite(entry.value))
  return entries.sort((a, b) => {
    const aIndex = Number.parseInt(a.name.replace(/[^0-9]/g, ''), 10)
    const bIndex = Number.parseInt(b.name.replace(/[^0-9]/g, ''), 10)
    if (Number.isFinite(aIndex) && Number.isFinite(bIndex) && aIndex !== bIndex) {
      return aIndex - bIndex
    }
    return a.name.localeCompare(b.name)
  })
}

const getLoadPercent = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return clampPercent(value * 100)
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
    const isHealthy = normalizedHealth === 'healthy' || normalizedHealth === 'ok'
    if (normalizedHealth && !isHealthy) {
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

const summarizeNetwork = (network?: StatusNetwork): NetworkSummary | null => {
  if (!network) return null
  
  // Use totals from instancectl format
  const totalRx = typeof network.rx_total_bytes === 'number' ? network.rx_total_bytes : 0
  const totalTx = typeof network.tx_total_bytes === 'number' ? network.tx_total_bytes : 0
  
  // Count interfaces
  let interfaceCount = 0
  if (network.interfaces) {
    interfaceCount = Object.keys(network.interfaces).length
  }
  
  return { totalRx, totalTx, interfaceCount }
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

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const normalizeContainerStatus = (key: string, raw: Record<string, unknown>): DockerContainerStatus => {
  const container: DockerContainerStatus = {}

  // Container ID
  if (typeof raw.id === 'string') {
    container.id = raw.id
  }

  // Health status
  if (typeof raw.health === 'string') {
    container.health = raw.health as StatusContainerHealth
  }

  // Status string
  if (typeof raw.status === 'string') {
    container.status = raw.status
  }

  // CPU metrics from instancectl format
  if (isPlainObject(raw.cpu)) {
    const cpu = raw.cpu as Record<string, unknown>
    container.cpu = {
      total_percent: toNumber(cpu.total_percent),
      used_percent: toNumber(cpu.used_percent),
      free_percent: toNumber(cpu.free_percent),
    }
  }

  // Memory metrics from instancectl format
  if (isPlainObject(raw.memory)) {
    const memory = raw.memory as Record<string, unknown>
    container.memory = {
      total_bytes: toNumber(memory.total_bytes),
      used_bytes: toNumber(memory.used_bytes),
      free_bytes: toNumber(memory.free_bytes),
    }
  }

  // Network metrics from instancectl format
  if (isPlainObject(raw.network)) {
    const network = raw.network as Record<string, unknown>
    container.network = {
      rx_total_bytes: toNumber(network.rx_total_bytes),
      tx_total_bytes: toNumber(network.tx_total_bytes),
    }
    if (isPlainObject(network.speed)) {
      const speed = network.speed as Record<string, unknown>
      container.network.speed = {
        rx_bytes: toNumber(speed.rx_bytes),
        tx_bytes: toNumber(speed.tx_bytes),
      }
    }
  }

  // Storage metrics from instancectl format
  if (isPlainObject(raw.storage)) {
    const storage = raw.storage as Record<string, unknown>
    container.storage = {
      read_total_bytes: toNumber(storage.read_total_bytes),
      write_total_bytes: toNumber(storage.write_total_bytes),
    }
    if (isPlainObject(storage.speed)) {
      const speed = storage.speed as Record<string, unknown>
      container.storage.speed = {
        read_bytes: toNumber(speed.read_bytes),
        write_bytes: toNumber(speed.write_bytes),
      }
    }
  }

  // Add normalized fields for UI compatibility
  // Store container name
  container.name = key

  // Map health to state for UI access (container?.state)
  if (container.health) {
    container.state = container.health
  }

  // Map memory to mem for UI access (container?.mem)
  if (container.memory) {
    container.mem = container.memory
  }

  // Map network to net for UI access (container?.net with in_bps, out_bps, rx_bytes, tx_bytes)
  if (container.network) {
    container.net = {
      rx_bytes: container.network.rx_total_bytes,
      tx_bytes: container.network.tx_total_bytes,
      in_bps: container.network.speed?.rx_bytes,
      out_bps: container.network.speed?.tx_bytes,
    }
  }

  // Map storage to block for UI access (container?.block)
  if (container.storage) {
    container.block = {
      read_total_bytes: container.storage.read_total_bytes,
      write_total_bytes: container.storage.write_total_bytes,
      speed: container.storage.speed,
    }
  }

  return container
}

const normalizeStatusPayload = (payload: Record<string, unknown>): StatusPayload | null => {
  const normalized: StatusPayload = {}

  if (typeof payload.timestamp === 'string') {
    normalized.timestamp = payload.timestamp
  }

  if (typeof payload.health_status === 'string') {
    normalized.health_status = payload.health_status
  } else if (typeof payload.healthStatus === 'string') {
    normalized.health_status = payload.healthStatus
  }

  if (isPlainObject(payload.instance)) {
    const instanceRaw = payload.instance as Record<string, unknown>
    const instance: NonNullable<StatusPayload['instance']> = {}

    // Handle hostname
    if (typeof instanceRaw.hostname === 'string') {
      instance.hostname = instanceRaw.hostname
    }

    // Handle new format fields
    if (typeof instanceRaw.status === 'string') {
      instance.status = instanceRaw.status as 'running' | 'down'
    }
    if (typeof instanceRaw.uptime_seconds === 'number') {
      instance.uptime_seconds = instanceRaw.uptime_seconds
    }
    if (typeof instanceRaw.process_count === 'number') {
      instance.process_count = instanceRaw.process_count
    }

    // Handle temperature array
    if (Array.isArray(instanceRaw.temperature)) {
      instance.temperature = instanceRaw.temperature as StatusTemperature[]
    }

    // Handle file descriptors
    if (isPlainObject(instanceRaw.file_descriptors)) {
      instance.file_descriptors = instanceRaw.file_descriptors as StatusFileDescriptors
    }

    // Handle GPU array
    if (Array.isArray(instanceRaw.gpu)) {
      instance.gpu = instanceRaw.gpu as StatusGpu[]
    }

    // Handle memory - instancectl format
    if (isPlainObject(instanceRaw.memory)) {
      const memory = instanceRaw.memory as Record<string, unknown>
      instance.memory = {
        total_bytes: toNumber(memory.total_bytes),
        used_bytes: toNumber(memory.used_bytes),
        free_bytes: toNumber(memory.free_bytes),
      }
      // Also store in display format
      instance.mem = {
        total_bytes: toNumber(memory.total_bytes),
        used_bytes: toNumber(memory.used_bytes),
        available_bytes: toNumber(memory.free_bytes),
      }
      
      // Handle swap - instancectl nests it inside memory
      if (isPlainObject(memory.swap)) {
        const swap = memory.swap as Record<string, unknown>
        instance.swap = {
          total_bytes: toNumber(swap.total_bytes),
          used_bytes: toNumber(swap.used_bytes),
          free_bytes: toNumber(swap.free_bytes),
        }
      }
    }

    // Handle swap (fallback for old format with separate swap property)
    if (!instance.swap && isPlainObject(instanceRaw.swap)) {
      instance.swap = instanceRaw.swap as StatusMemory
    }

    if (isPlainObject(instanceRaw.cpu)) {
      const cpuRaw = instanceRaw.cpu as Record<string, unknown>
      
      // instancectl format
      instance.cpu = {
        total_percent: toNumber(cpuRaw.total_percent),
        used_percent: toNumber(cpuRaw.used_percent),
        free_percent: toNumber(cpuRaw.free_percent),
        iowait_percent: toNumber(cpuRaw.iowait_percent),
      }

      // Add metrics wrapper for UI access (cpu.metrics.used_percent etc)
      instance.cpu.metrics = {
        total_percent: toNumber(cpuRaw.total_percent),
        used_percent: toNumber(cpuRaw.used_percent),
        free_percent: toNumber(cpuRaw.free_percent),
        iowait_percent: toNumber(cpuRaw.iowait_percent),
      }

      // Handle load_avg
      if (isPlainObject(cpuRaw.load_avg)) {
        const loadAvg = cpuRaw.load_avg as Record<string, unknown>
        instance.cpu.load_avg = {
          '1m_percent': toNumber(loadAvg['1m_percent']),
          '5m_percent': toNumber(loadAvg['5m_percent']),
          '15m_percent': toNumber(loadAvg['15m_percent']),
        }
      }

      // Handle cores - instancectl provides array [{name, used_percent}], convert to Record<string, number>
      if (Array.isArray(cpuRaw.cores)) {
        const coresArray = cpuRaw.cores as Array<{ name?: string; used_percent?: number }>
        const cores: Record<string, number> = {}
        coresArray.forEach((core) => {
          const name = core?.name
          const value = toNumber(core?.used_percent)
          if (name && value !== undefined) {
            cores[name] = value
          }
        })
        if (Object.keys(cores).length > 0) {
          instance.cpu.cores = cores
        }
      } else if (isPlainObject(cpuRaw.cores)) {
        // Fallback for old format: Record<string, number>
        const coresRaw = cpuRaw.cores as Record<string, unknown>
        const cores: Record<string, number> = {}
        Object.entries(coresRaw).forEach(([key, value]) => {
          const parsed = toNumber(value)
          if (parsed !== undefined) {
            cores[key] = parsed
          }
        })
        if (Object.keys(cores).length > 0) {
          instance.cpu.cores = cores
        }
      }
    }

    if (isPlainObject(instanceRaw.network)) {
      const networkRaw = instanceRaw.network as Record<string, unknown>

      // instancectl format with rx_total_bytes, tx_total_bytes
      const rxTotal = toNumber(networkRaw.rx_total_bytes)
      const txTotal = toNumber(networkRaw.tx_total_bytes)
      
      // Store network data
      instance.network = {
        rx_total_bytes: rxTotal,
        tx_total_bytes: txTotal,
        rx_total_errors: toNumber(networkRaw.rx_total_errors),
        tx_total_errors: toNumber(networkRaw.tx_total_errors),
        rx_total_drops: toNumber(networkRaw.rx_total_drops),
        tx_total_drops: toNumber(networkRaw.tx_total_drops),
      }
      
      // Handle interfaces - instancectl provides array [{name, rx_bytes, tx_bytes}], convert to Record
      if (Array.isArray(networkRaw.interfaces)) {
        const interfacesArray = networkRaw.interfaces as Array<{ name?: string; rx_bytes?: number; tx_bytes?: number }>
        const interfaces: Record<string, { rx_bytes?: number; tx_bytes?: number }> = {}
        interfacesArray.forEach((iface) => {
          const name = iface?.name
          if (name) {
            interfaces[name] = {
              rx_bytes: toNumber(iface?.rx_bytes),
              tx_bytes: toNumber(iface?.tx_bytes),
            }
          }
        })
        if (Object.keys(interfaces).length > 0) {
          instance.network.interfaces = interfaces
        }
      } else if (isPlainObject(networkRaw.interfaces)) {
        // Fallback for old format: Record<string, {rx_bytes, tx_bytes}>
        instance.network.interfaces = networkRaw.interfaces as Record<string, { rx_bytes?: number; tx_bytes?: number }>
      }
      
      // Handle speed
      if (isPlainObject(networkRaw.speed)) {
        const speed = networkRaw.speed as Record<string, unknown>
        instance.network.speed = {
          rx_bytes: toNumber(speed.rx_bytes),
          tx_bytes: toNumber(speed.tx_bytes),
        }
        // Also store in display format
        instance.network_speed = {
          in_bps: toNumber(speed.rx_bytes),
          out_bps: toNumber(speed.tx_bytes),
        }
      }
    }

    if (isPlainObject(instanceRaw.storage)) {
      const storage = instanceRaw.storage as Record<string, unknown>
      
      // instancectl format with total_bytes, used_bytes, free_bytes
      instance.storage = {
        total_bytes: toNumber(storage.total_bytes),
        used_bytes: toNumber(storage.used_bytes),
        free_bytes: toNumber(storage.free_bytes),
        read_total_bytes: toNumber(storage.read_total_bytes),
        write_total_bytes: toNumber(storage.write_total_bytes),
      }
      
      // Also store in display format
      instance.storage_root = {
        total_bytes: toNumber(storage.total_bytes),
        used_bytes: toNumber(storage.used_bytes),
        available_bytes: toNumber(storage.free_bytes),
      }
      
      instance.storage_io = {
        read_bytes: toNumber(storage.read_total_bytes),
        write_bytes: toNumber(storage.write_total_bytes),
      }
      
      // Handle speed
      if (isPlainObject(storage.speed)) {
        const speed = storage.speed as Record<string, unknown>
        instance.storage.speed = {
          read_bytes: toNumber(speed.read_bytes),
          write_bytes: toNumber(speed.write_bytes),
        }
        instance.storage_speed = {
          read_bps: toNumber(speed.read_bytes),
          write_bps: toNumber(speed.write_bytes),
        }
      }
    }

    if (Object.keys(instance).length > 0) {
      normalized.instance = instance
    }
  }

  if (isPlainObject(payload.docker)) {
    const dockerRaw = payload.docker as Record<string, unknown>
    const docker: NonNullable<StatusPayload['docker']> = {}

    if (typeof dockerRaw.compose_errors === 'string' || dockerRaw.compose_errors === null) {
      docker.compose_errors = dockerRaw.compose_errors as NonNullable<StatusPayload['docker']>['compose_errors']
    }

    if (isPlainObject(dockerRaw.containers)) {
      const containersRaw = dockerRaw.containers as Record<string, unknown>
      const containers: Record<string, DockerContainerStatus> = {}
      Object.entries(containersRaw).forEach(([key, value]) => {
        if (!isPlainObject(value)) return
        containers[key] = normalizeContainerStatus(key, value as Record<string, unknown>)
      })
      if (Object.keys(containers).length > 0) {
        docker.containers = containers
      }
    }

    if (Object.keys(docker).length > 0) {
      normalized.docker = docker
    }
  }

  if (!normalized.timestamp && !normalized.health_status && !normalized.instance && !normalized.docker) {
    return null
  }

  return normalized
}

const isStatusInstance = (
  value: StatusPayload['instance'] | undefined
): value is NonNullable<StatusPayload['instance']> => isPlainObject(value)

const isStatusDocker = (
  value: StatusPayload['docker'] | undefined
): value is NonNullable<StatusPayload['docker']> => isPlainObject(value)

const cardClassName = 'rounded-2xl border border-border/60 bg-background/90 p-5 shadow-sm'
const statusCardClassName =
  'flex h-full flex-col gap-2 border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
const statusCardHeaderClass =
  'text-xs font-bold uppercase text-gray-500 dark:text-slate-400'
const statusCardValueClass =
  'text-2xl font-mono font-semibold text-gray-800 dark:text-slate-100'
const statusCardLabelClass =
  'text-[11px] text-gray-400 dark:text-slate-500'
const statusRowLabelClass =
  'text-[11px] uppercase text-gray-500 dark:text-slate-400'
const statusTrackClass = 'bg-gray-200 dark:bg-slate-800'
const trendTileClassName =
  'border border-gray-200 bg-white p-2 text-[11px] text-gray-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
const trendTileValueClassName = 'font-mono font-semibold text-gray-800 dark:text-slate-100'
const coreBarClasses = [
  'bg-sky-500/80 dark:bg-sky-400/80',
  'bg-orange-500/80 dark:bg-orange-400/80',
]

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
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusData, setStatusData] = useState<Record<string, string>>({})
  const [statusPayload, setStatusPayload] = useState<StatusPayload | null>(null)
  const [trendSeries, setTrendSeries] = useState<TrendSeriesState>(() => ({
    instance: createTrendSeriesBlock(),
    services: {},
  }))
  const cliOutputRef = useRef<HTMLPreElement | null>(null)
  const cliAutoScrollRef = useRef(true)
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
  const networkSummary = useMemo(
    () => summarizeNetwork(instanceStatus?.network),
    [instanceStatus?.network]
  )
  const loadSeries = useMemo(
    () => [
      { label: '1m', value: instanceStatus?.cpu?.load_avg?.['1m_percent'] },
      { label: '5m', value: instanceStatus?.cpu?.load_avg?.['5m_percent'] },
      { label: '15m', value: instanceStatus?.cpu?.load_avg?.['15m_percent'] },
    ],
    [instanceStatus?.cpu?.load_avg?.['1m_percent'], instanceStatus?.cpu?.load_avg?.['5m_percent'], instanceStatus?.cpu?.load_avg?.['15m_percent']]
  )

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

  const applyStatusUpdate = useCallback((status: Record<string, unknown> | null, rawOutput?: string) => {
    let parsedPayload: StatusPayload | null = null
    if (typeof rawOutput === 'string') {
      try {
        const parsed = JSON.parse(rawOutput.trim())
        if (isPlainObject(parsed)) {
          parsedPayload = normalizeStatusPayload(parsed)
        }
      } catch {
        // Fall back to status map
      }
    }
    if (!parsedPayload && isPlainObject(status)) {
      parsedPayload = normalizeStatusPayload(status)
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
  }, [])

  useEffect(() => {
    if (!selectedServer?.id || !canUse) {
      setStatusLoading(false)
      setStatusError(null)
      setStatusData({})
      setStatusPayload(null)
      return
    }

    setStatusData({})
    setStatusPayload(null)

    if (!socket || !socketConnected) {
      setStatusLoading(false)
      setStatusError('Socket disconnected. Live updates paused.')
      return
    }

    setStatusError(null)
    setStatusLoading(true)
    socket.emit('server-management:status-start', selectedServer.id)

    return () => {
      socket.emit('server-management:status-stop', selectedServer.id)
    }
  }, [selectedServer?.id, canUse, socket, socketConnected])

  useEffect(() => {
    if (!socket) return

    const handleStatusUpdate = (payload: StatusUpdatePayload) => {
      if (!selectedServer?.id) return
      if (payload?.serverId && payload.serverId !== selectedServer.id) return
      applyStatusUpdate(payload.status ?? null, payload.rawOutput)
      setStatusError(null)
      setStatusLoading(false)
    }

    const handleStatusError = (payload: StatusErrorPayload) => {
      if (!selectedServer?.id) return
      if (payload?.serverId && payload.serverId !== selectedServer.id) return
      setStatusError(payload.message || 'Unable to load server status')
      setStatusLoading(false)
    }

    socket.on(SocketServerManagementEvents.STATUS_UPDATE, handleStatusUpdate)
    socket.on(SocketServerManagementEvents.STATUS_ERROR, handleStatusError)

    return () => {
      socket.off(SocketServerManagementEvents.STATUS_UPDATE, handleStatusUpdate)
      socket.off(SocketServerManagementEvents.STATUS_ERROR, handleStatusError)
    }
  }, [socket, selectedServer?.id, applyStatusUpdate])

  useEffect(() => {
    setTrendSeries({
      instance: createTrendSeriesBlock(),
      services: {},
    })
  }, [selectedServer?.id])

  useEffect(() => {
    if (!statusPayload || !selectedServer) return

    setTrendSeries((prev) => {
      const instanceCpu = clampPercent(instanceStatus?.cpu?.metrics?.used_percent)
      const instanceMemory = getUsagePercent(
        instanceStatus?.mem?.used_bytes,
        instanceStatus?.mem?.total_bytes
      )
      const instanceNetIn = toNumber(instanceStatus?.network_speed?.in_bps) ?? null
      const instanceNetOut = toNumber(instanceStatus?.network_speed?.out_bps) ?? null
      const instanceStorageRead = toNumber(instanceStatus?.storage_speed?.read_bps) ?? null
      const instanceStorageWrite = toNumber(instanceStatus?.storage_speed?.write_bps) ?? null

      const nextInstance = updateTrendSeriesBlock(prev.instance, {
        cpu: instanceCpu,
        memory: instanceMemory,
        netIn: instanceNetIn,
        netOut: instanceNetOut,
        storageRead: instanceStorageRead,
        storageWrite: instanceStorageWrite,
      })

      const nextServices: Record<string, TrendSeriesBlock> = {}
      selectedServer.services.forEach((service) => {
        const key = service.serviceName || service.name
        if (!key) return
        const container = getContainerForService(service, dockerStatus?.containers)
        const cpuPercent = container ? getContainerCpuPercent(container) : null
        const memPercent = container ? getContainerMemPercent(container.mem) : null
        const netIn = toNumber(container?.net?.in_bps) ?? null
        const netOut = toNumber(container?.net?.out_bps) ?? null
        const { read: blockRead, write: blockWrite } = getBlockSpeed(container?.block)
        const serviceSeries = prev.services[key] ?? createTrendSeriesBlock()
        nextServices[key] = updateTrendSeriesBlock(serviceSeries, {
          cpu: cpuPercent,
          memory: memPercent,
          netIn,
          netOut,
          storageRead: blockRead,
          storageWrite: blockWrite,
        })
      })

      return {
        instance: nextInstance,
        services: nextServices,
      }
    })
  }, [statusPayload, selectedServer?.id, selectedServer?.services, instanceStatus, dockerStatus?.containers])

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
    const storageIo = instanceStatus?.storage_io
    const storageIoSplit = getSplitPercents(storageIo?.read_bytes, storageIo?.write_bytes)
    const storageSpeed = instanceStatus?.storage_speed
    const storageSpeedSplit = getSplitPercents(storageSpeed?.read_bps, storageSpeed?.write_bps)
    const instanceTrends = trendSeries.instance
    const cpuMetrics = instanceStatus?.cpu?.metrics
    const cpuCoreEntries = getCpuCoreEntries(instanceStatus?.cpu?.cores)
    const healthStatus = statusPayload?.health_status?.trim()
    const healthLower = healthStatus?.toLowerCase()
    const isHealthy =
      healthLower === 'ok' || healthLower === 'healthy' || healthLower === 'online'
    const headerStatusTone =
      (healthStatus ? isHealthy : socketConnected)
        ? 'bg-emerald-500 dark:bg-emerald-400'
        : 'bg-rose-500 dark:bg-rose-400'
    const statusLabel = healthStatus
      ? isHealthy
        ? 'ONLINE'
        : healthStatus.toUpperCase()
      : socketConnected
        ? 'ONLINE'
        : 'OFFLINE'
    const socketStatusLabel = socketConnected ? 'Socket Connected' : 'Socket Disconnected'
    const updatedTime = formatTimestampTime(statusPayload?.timestamp)
    const cpuUsagePercent = clampPercent(cpuMetrics?.used_percent)
    const cpuStatusLabel =
      cpuUsagePercent === null ? '—' : cpuUsagePercent >= 80 ? 'High' : 'Nominal'
    const networkSplit = getSplitPercents(networkSummary?.totalRx, networkSummary?.totalTx)
    const networkTotal =
      networkSummary ? networkSummary.totalRx + networkSummary.totalTx : null
    const networkSpeed = instanceStatus?.network_speed
    const hasNetworkSpeed =
      typeof networkSpeed?.in_bps === 'number' || typeof networkSpeed?.out_bps === 'number'
    const networkSpeedInValue = toNumber(networkSpeed?.in_bps) ?? getLastValue(instanceTrends.netIn)
    const networkSpeedOutValue = toNumber(networkSpeed?.out_bps) ?? getLastValue(instanceTrends.netOut)
    const storageSpeedReadValue = toNumber(storageSpeed?.read_bps) ?? getLastValue(instanceTrends.storageRead)
    const storageSpeedWriteValue = toNumber(storageSpeed?.write_bps) ?? getLastValue(instanceTrends.storageWrite)
    const networkSpeedTotal = hasNetworkSpeed
      ? (networkSpeed?.in_bps ?? 0) + (networkSpeed?.out_bps ?? 0)
      : null
    const networkActivityLabel =
      networkSpeedTotal !== null ? getSpeedActivityLabel(networkSpeedTotal) : getActivityLabel(networkTotal)
    const networkSpeedSplit = getSplitPercents(networkSpeed?.in_bps, networkSpeed?.out_bps)
    const hasStorageSpeed =
      typeof storageSpeed?.read_bps === 'number' || typeof storageSpeed?.write_bps === 'number'
    const networkSplitForBar = hasNetworkSpeed ? networkSpeedSplit : networkSplit
    const storageSplitForBar = hasStorageSpeed ? storageSpeedSplit : storageIoSplit
    const trendWindowLabel = `${TREND_POINTS}s`

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
            <div className="space-y-3">
              <div className="flex flex-col gap-2 border border-gray-200 bg-white p-3 text-[11px] uppercase text-gray-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Server: {server.name}</span>
                  <span className="text-gray-400 dark:text-slate-500">[{server.host || '—'}]</span>
                  {instanceStatus?.hostname && instanceStatus.hostname !== server.name && (
                    <span className="text-gray-400 dark:text-slate-500">({instanceStatus.hostname})</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {instanceStatus?.uptime_seconds !== undefined && (
                    <span className="text-gray-400 dark:text-slate-500">
                      Uptime: {formatUptime(instanceStatus.uptime_seconds)}
                    </span>
                  )}
                  {instanceStatus?.process_count !== undefined && (
                    <span className="text-gray-400 dark:text-slate-500">
                      Processes: {instanceStatus.process_count}
                    </span>
                  )}
                  <div className="flex items-center gap-2 font-mono font-semibold text-gray-700 dark:text-slate-200">
                    <span className={cn('h-2 w-2 rounded-full', headerStatusTone)} />
                    <span>{statusLabel} ({socketStatusLabel})</span>
                  </div>
                  <span className="text-gray-400 dark:text-slate-500">Updated {updatedTime}</span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className={statusCardClassName}>
                  <div className="flex items-center justify-between">
                    <p className={statusCardHeaderClass}>CPU Usage</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={statusCardValueClass}>{formatPercentOne(cpuUsagePercent)}</span>
                    <span className={statusCardLabelClass}>Status {cpuStatusLabel}</span>
                  </div>
                  {renderPercentBar(cpuUsagePercent, getUsageTone(cpuUsagePercent), {
                    trackClass: statusTrackClass,
                  })}
                  <div className="flex items-center justify-between">
                    <span className={statusRowLabelClass}>Total</span>
                    <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                      {formatPercent(cpuMetrics?.total_percent)}
                    </span>
                  </div>
                  <div className="border-t border-dashed border-gray-200 dark:border-slate-800 my-2" />

                  <div className="space-y-1">
                    <p className={statusCardHeaderClass}>Load Avg</p>
                    {loadSeries.map((entry) => {
                      const loadPercent = getLoadPercent(entry.value)
                      return (
                        <div key={entry.label} className="flex items-center gap-2">
                          <span className="w-10 font-mono text-gray-500 dark:text-slate-400">
                            {entry.label}
                          </span>
                          <span className="w-12 text-right font-mono font-semibold text-gray-800 dark:text-slate-100">
                            {formatPercentOne(loadPercent)}
                          </span>
                          <div className="flex-1">
                            {renderMiniBar(loadPercent, getUsageTone(loadPercent), {
                              trackClass: statusTrackClass,
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-1">
                    <p className={statusCardHeaderClass}>Active Cores</p>
                    {cpuCoreEntries.length === 0 && (
                      <p className={statusCardLabelClass}>No core data.</p>
                    )}
                    {cpuCoreEntries.map((core, index) => {
                      const percent = clampPercent(core.value)
                      const coreLabel = core.name.startsWith('cpu')
                        ? `Core ${core.name.slice(3)}`
                        : core.name
                      const coreTone = coreBarClasses[index % coreBarClasses.length]
                      return (
                        <div key={core.name} className="flex items-center gap-2">
                          <span className="w-14 font-mono text-gray-500 dark:text-slate-400">
                            {coreLabel}
                          </span>
                          <span className="w-12 text-right font-mono font-semibold text-gray-800 dark:text-slate-100">
                            {formatPercentOne(core.value)}
                          </span>
                          <div className="flex-1">
                            {renderMiniBar(percent, coreTone, { trackClass: statusTrackClass })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className={statusCardClassName}>
                  <div className="flex items-center justify-between">
                    <p className={statusCardHeaderClass}>Memory</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={statusCardValueClass}>{formatPercentShort(memoryPercent)}</span>
                    <span className={statusCardLabelClass}>Usage</span>
                  </div>
                  {renderPercentBar(memoryPercent, getUsageTone(memoryPercent), {
                    trackClass: statusTrackClass,
                  })}
                  <div className="border-t border-dashed border-gray-200 dark:border-slate-800 my-2" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Used</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                        {formatBytes(instanceStatus.mem?.used_bytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Free</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                        {formatBytes(instanceStatus.mem?.available_bytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Total</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                        {formatBytes(instanceStatus.mem?.total_bytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn(statusRowLabelClass, 'text-gray-400 dark:text-slate-500')}>
                        Cache
                      </span>
                      <span className="font-mono font-semibold text-gray-400 dark:text-slate-500">—</span>
                    </div>
                  </div>
                </div>

                <div className={statusCardClassName}>
                  <div className="flex items-center justify-between">
                    <p className={statusCardHeaderClass}>Storage</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={statusCardValueClass}>{formatPercentShort(storagePercent)}</span>
                    <span className={statusCardLabelClass}>Usage</span>
                  </div>
                  {renderPercentBar(storagePercent, getUsageTone(storagePercent), {
                    trackClass: statusTrackClass,
                  })}
                  <div className="border-t border-dashed border-gray-200 dark:border-slate-800 my-2" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Read</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                        {formatBytes(storageIo?.read_bytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Write</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                        {formatBytes(storageIo?.write_bytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Capacity</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                        {formatBytes(instanceStatus.storage_root?.used_bytes)} /{' '}
                        {formatBytes(instanceStatus.storage_root?.total_bytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Speed</span>
                      <span className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <ArrowDownRight className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                          <span className="uppercase text-gray-500 dark:text-slate-400">Read</span>
                          <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                            {formatBytesPerSecond(storageSpeed?.read_bps)}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                          <span className="uppercase text-gray-500 dark:text-slate-400">Write</span>
                          <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                            {formatBytesPerSecond(storageSpeed?.write_bps)}
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>
                  {renderSplitBar(storageSplitForBar.read, storageSplitForBar.write, {
                    readClass: IO_READ_CLASS,
                    writeClass: IO_WRITE_CLASS,
                    trackClass: statusTrackClass,
                  })}
                </div>

                <div className={statusCardClassName}>
                  <div className="flex items-center justify-between">
                    <p className={statusCardHeaderClass}>Network</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={statusCardValueClass}>{formatBytes(networkTotal)}</span>
                    <span className={statusCardLabelClass}>Total</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400">
                    Activity: <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">{networkActivityLabel}</span>
                  </div>
                  <div className="border-t border-dashed border-gray-200 dark:border-slate-800 my-2" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] uppercase text-gray-500 dark:text-slate-400">
                        <ArrowDownRight className="h-3 w-3" />
                        Inbound
                      </span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                        {formatBytes(networkSummary?.totalRx)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] uppercase text-gray-500 dark:text-slate-400">
                        <ArrowUpRight className="h-3 w-3" />
                        Outbound
                      </span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                        {formatBytes(networkSummary?.totalTx)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Speed</span>
                      <span className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <ArrowDownRight className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                          <span className="uppercase text-gray-500 dark:text-slate-400">In</span>
                          <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                            {formatBitsPerSecond(networkSpeed?.in_bps)}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                          <span className="uppercase text-gray-500 dark:text-slate-400">Out</span>
                          <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                            {formatBitsPerSecond(networkSpeed?.out_bps)}
                          </span>
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={statusRowLabelClass}>Status</span>
                      <span className="flex items-center gap-2 font-mono font-semibold text-gray-800 dark:text-slate-100">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            socketConnected
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : 'bg-amber-500 dark:bg-amber-400'
                          )}
                        />
                        {socketConnected ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                  {renderSplitBar(networkSplitForBar.read, networkSplitForBar.write, {
                    readClass: IO_READ_CLASS,
                    writeClass: IO_WRITE_CLASS,
                    trackClass: statusTrackClass,
                  })}
                </div>
              </div>

              <details className="group border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <summary className="flex items-center justify-between px-3 py-2 text-[11px] uppercase text-gray-500 dark:text-slate-400 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span>Detailed Summary</span>
                  <span className="text-[10px] uppercase text-gray-400 dark:text-slate-500 group-open:hidden">
                    Expand
                  </span>
                  <span className="text-[10px] uppercase text-gray-400 dark:text-slate-500 hidden group-open:inline">
                    Collapse
                  </span>
                </summary>
                <div className="border-t border-gray-200 dark:border-slate-800 p-3 space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
                    {[
                      { label: 'CPU Used', value: formatPercentOne(cpuUsagePercent) },
                      {
                        label: 'Load 1m',
                        value: formatPercentOne(getLoadPercent(instanceStatus.cpu?.load_avg?.['1m_percent'])),
                      },
                      {
                        label: 'Load 5m',
                        value: formatPercentOne(getLoadPercent(instanceStatus.cpu?.load_avg?.['5m_percent'])),
                      },
                      {
                        label: 'Load 15m',
                        value: formatPercentOne(getLoadPercent(instanceStatus.cpu?.load_avg?.['15m_percent'])),
                      },
                      ...(instanceStatus.cpu?.iowait_percent !== undefined
                        ? [{ label: 'I/O Wait', value: formatPercentOne(instanceStatus.cpu.iowait_percent) }]
                        : []),
                      { label: 'Memory Used', value: formatBytes(instanceStatus.mem?.used_bytes) },
                      { label: 'Memory Free', value: formatBytes(instanceStatus.mem?.available_bytes) },
                      { label: 'Storage Used', value: formatBytes(instanceStatus.storage_root?.used_bytes) },
                      { label: 'Storage Free', value: formatBytes(instanceStatus.storage_root?.available_bytes) },
                      { label: 'Storage R Speed', value: formatBytesPerSecond(storageSpeed?.read_bps) },
                      { label: 'Storage W Speed', value: formatBytesPerSecond(storageSpeed?.write_bps) },
                      { label: 'Net In', value: formatBytes(networkSummary?.totalRx) },
                      { label: 'Net Out', value: formatBytes(networkSummary?.totalTx) },
                      { label: 'Net In Speed', value: formatBitsPerSecond(networkSpeed?.in_bps) },
                      { label: 'Net Out Speed', value: formatBitsPerSecond(networkSpeed?.out_bps) },
                      ...(instanceStatus.uptime_seconds !== undefined
                        ? [{ label: 'Uptime', value: formatUptime(instanceStatus.uptime_seconds) }]
                        : []),
                      ...(instanceStatus.process_count !== undefined
                        ? [{ label: 'Processes', value: String(instanceStatus.process_count) }]
                        : []),
                      ...(instanceStatus.file_descriptors?.allocated !== undefined
                        ? [{ label: 'Open FDs', value: `${instanceStatus.file_descriptors.allocated}/${instanceStatus.file_descriptors?.max || '—'}` }]
                        : []),
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-2">
                        <span className={statusRowLabelClass}>{item.label}</span>
                        <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Temperature Section */}
                  {instanceStatus.temperature && instanceStatus.temperature.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-slate-800 pt-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400 mb-2">
                        Temperature Sensors
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
                        {instanceStatus.temperature.map((sensor, idx) => (
                          <div key={sensor.zone || idx} className="flex items-center justify-between gap-2">
                            <span className={statusRowLabelClass}>
                              {sensor.label || sensor.zone || `Sensor ${idx}`}
                            </span>
                            <span className={cn(
                              'font-mono font-semibold',
                              sensor.temperature_celsius !== undefined && sensor.temperature_celsius > 80
                                ? 'text-red-600 dark:text-red-400'
                                : sensor.temperature_celsius !== undefined && sensor.temperature_celsius > 60
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-gray-800 dark:text-slate-100'
                            )}>
                              {sensor.temperature_celsius !== undefined ? `${sensor.temperature_celsius.toFixed(1)}°C` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GPU Section */}
                  {instanceStatus.gpu && instanceStatus.gpu.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-slate-800 pt-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400 mb-2">
                        GPU ({instanceStatus.gpu.length})
                      </p>
                      <div className="space-y-3">
                        {instanceStatus.gpu.map((gpu, idx) => (
                          <div key={gpu.index ?? idx} className="border border-gray-100 dark:border-slate-800/50 p-2 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-gray-700 dark:text-slate-200">
                                {gpu.name || `GPU ${gpu.index ?? idx}`}
                              </span>
                              {gpu.temperature_celsius !== undefined && (
                                <span className={cn(
                                  'font-mono',
                                  gpu.temperature_celsius > 80
                                    ? 'text-red-600 dark:text-red-400'
                                    : gpu.temperature_celsius > 60
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-gray-500 dark:text-slate-400'
                                )}>
                                  {gpu.temperature_celsius.toFixed(0)}°C
                                </span>
                              )}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
                              {gpu.utilization?.used_percent !== undefined && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className={statusRowLabelClass}>Utilization</span>
                                  <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                                    {formatPercentOne(gpu.utilization.used_percent)}
                                  </span>
                                </div>
                              )}
                              {gpu.memory?.used_bytes !== undefined && gpu.memory?.total_bytes !== undefined && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className={statusRowLabelClass}>VRAM</span>
                                  <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                                    {formatBytes(gpu.memory.used_bytes)} / {formatBytes(gpu.memory.total_bytes)}
                                  </span>
                                </div>
                              )}
                              {gpu.power_watts !== undefined && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className={statusRowLabelClass}>Power</span>
                                  <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                                    {gpu.power_watts.toFixed(0)}W{gpu.power_limit_watts ? ` / ${gpu.power_limit_watts.toFixed(0)}W` : ''}
                                  </span>
                                </div>
                              )}
                              {gpu.fan_percent !== undefined && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className={statusRowLabelClass}>Fan</span>
                                  <span className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                                    {formatPercentOne(gpu.fan_percent)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-slate-800 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                        Live Trends
                      </span>
                      <span className="text-[10px] uppercase text-gray-400 dark:text-slate-500">
                        Last {trendWindowLabel}
                      </span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                          Instance
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className={trendTileClassName}>
                            <div className="flex items-center justify-between">
                              <span className={statusRowLabelClass}>CPU</span>
                              <span className={trendTileValueClassName}>
                                {formatPercentOne(cpuUsagePercent)}
                              </span>
                            </div>
                            <SparklineChart
                              series={[
                                {
                                  data: instanceTrends.cpu,
                                  strokeClass: 'text-emerald-500 dark:text-emerald-400',
                                },
                              ]}
                            />
                          </div>
                          <div className={trendTileClassName}>
                            <div className="flex items-center justify-between">
                              <span className={statusRowLabelClass}>Memory</span>
                              <span className={trendTileValueClassName}>
                                {formatPercentOne(memoryPercent)}
                              </span>
                            </div>
                            <SparklineChart
                              series={[
                                {
                                  data: instanceTrends.memory,
                                  strokeClass: 'text-sky-500 dark:text-sky-400',
                                },
                              ]}
                            />
                          </div>
                          <div className={cn(trendTileClassName, 'sm:col-span-2')}>
                            <div className="flex items-center justify-between">
                              <span className={statusRowLabelClass}>Network In/Out</span>
                              <span
                                className={cn(
                                  trendTileValueClassName,
                                  'flex flex-wrap items-center justify-end gap-3 text-[11px]'
                                )}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <ArrowDownRight className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                                  <span className="uppercase text-gray-500 dark:text-slate-400">In</span>
                                  <span>{formatBitsPerSecond(networkSpeedInValue ?? undefined)}</span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <ArrowUpRight className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                                  <span className="uppercase text-gray-500 dark:text-slate-400">Out</span>
                                  <span>{formatBitsPerSecond(networkSpeedOutValue ?? undefined)}</span>
                                </span>
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-[10px] uppercase text-gray-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                                In
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                                Out
                              </span>
                            </div>
                            <SparklineChart
                              series={[
                                {
                                  data: instanceTrends.netIn,
                                  strokeClass: 'text-sky-500 dark:text-sky-400',
                                },
                                {
                                  data: instanceTrends.netOut,
                                  strokeClass: 'text-amber-500 dark:text-amber-400',
                                },
                              ]}
                            />
                          </div>
                          <div className={cn(trendTileClassName, 'sm:col-span-2')}>
                            <div className="flex items-center justify-between">
                              <span className={statusRowLabelClass}>Storage R/W</span>
                              <span
                                className={cn(
                                  trendTileValueClassName,
                                  'flex flex-wrap items-center justify-end gap-3 text-[11px]'
                                )}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <ArrowDownRight className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                                  <span className="uppercase text-gray-500 dark:text-slate-400">Read</span>
                                  <span>{formatBytesPerSecond(storageSpeedReadValue ?? undefined)}</span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <ArrowUpRight className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                                  <span className="uppercase text-gray-500 dark:text-slate-400">Write</span>
                                  <span>{formatBytesPerSecond(storageSpeedWriteValue ?? undefined)}</span>
                                </span>
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-[10px] uppercase text-gray-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                                Read
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                                Write
                              </span>
                            </div>
                            <SparklineChart
                              series={[
                                {
                                  data: instanceTrends.storageRead,
                                  strokeClass: 'text-sky-500 dark:text-sky-400',
                                },
                                {
                                  data: instanceTrends.storageWrite,
                                  strokeClass: 'text-amber-500 dark:text-amber-400',
                                },
                              ]}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                          Service Trends
                        </p>
                        {server.services.length === 0 && (
                          <p className="text-[11px] text-gray-400 dark:text-slate-500">
                            No services configured.
                          </p>
                        )}
                        <div className="space-y-2">
                          {server.services.map((service, index) => {
                            const serviceKey =
                              service.serviceName || service.name || `service-${index}`
                            const trendBlock =
                              trendSeries.services[serviceKey] ?? emptyTrendSeriesBlock
                            const container = getContainerForService(service, dockerStatus?.containers)
                            const cpuPercent = container ? getContainerCpuPercent(container) : null
                            const memPercent = container ? getContainerMemPercent(container.mem) : null
                            const netIn =
                              toNumber(container?.net?.in_bps) ?? getLastValue(trendBlock.netIn)
                            const netOut =
                              toNumber(container?.net?.out_bps) ?? getLastValue(trendBlock.netOut)
                            const { read: blockRead, write: blockWrite } = getBlockSpeed(container?.block)
                            const storageRead =
                              blockRead ?? getLastValue(trendBlock.storageRead)
                            const storageWrite =
                              blockWrite ?? getLastValue(trendBlock.storageWrite)
                            const cpuValue = cpuPercent ?? getLastValue(trendBlock.cpu)
                            const memValue = memPercent ?? getLastValue(trendBlock.memory)

                            return (
                              <div key={serviceKey} className={trendTileClassName}>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-800 dark:text-slate-100">
                                      {service.name}
                                    </p>
                                    <p className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                                      {service.serviceName || '—'}
                                    </p>
                                  </div>
                                  <span className="text-[10px] uppercase text-gray-400 dark:text-slate-500">
                                    {container?.state ? container.state : 'No data'}
                                  </span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className={statusRowLabelClass}>CPU/Mem</span>
                                      <span className={trendTileValueClassName}>
                                        {formatPercentOne(cpuValue)} / {formatPercentOne(memValue)}
                                      </span>
                                    </div>
                                    <SparklineChart
                                      height={40}
                                      series={[
                                        {
                                          data: trendBlock.cpu,
                                          strokeClass: 'text-emerald-500 dark:text-emerald-400',
                                        },
                                        {
                                          data: trendBlock.memory,
                                          strokeClass: 'text-sky-500 dark:text-sky-400',
                                        },
                                      ]}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className={statusRowLabelClass}>Net In/Out</span>
                                      <span
                                        className={cn(
                                          trendTileValueClassName,
                                          'flex flex-wrap items-center justify-end gap-3 text-[11px]'
                                        )}
                                      >
                                        <span className="inline-flex items-center gap-1">
                                          <ArrowDownRight className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                                          <span className="uppercase text-gray-500 dark:text-slate-400">
                                            In
                                          </span>
                                          <span>{formatBitsPerSecond(netIn ?? undefined)}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          <ArrowUpRight className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                                          <span className="uppercase text-gray-500 dark:text-slate-400">
                                            Out
                                          </span>
                                          <span>{formatBitsPerSecond(netOut ?? undefined)}</span>
                                        </span>
                                      </span>
                                    </div>
                                    <SparklineChart
                                      height={40}
                                      series={[
                                        {
                                          data: trendBlock.netIn,
                                          strokeClass: 'text-sky-500 dark:text-sky-400',
                                        },
                                        {
                                          data: trendBlock.netOut,
                                          strokeClass: 'text-amber-500 dark:text-amber-400',
                                        },
                                      ]}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className={statusRowLabelClass}>Storage R/W</span>
                                      <span
                                        className={cn(
                                          trendTileValueClassName,
                                          'flex flex-wrap items-center justify-end gap-3 text-[11px]'
                                        )}
                                      >
                                        <span className="inline-flex items-center gap-1">
                                          <ArrowDownRight className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                                          <span className="uppercase text-gray-500 dark:text-slate-400">
                                            Read
                                          </span>
                                          <span>{formatBytesPerSecond(storageRead ?? undefined)}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          <ArrowUpRight className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                                          <span className="uppercase text-gray-500 dark:text-slate-400">
                                            Write
                                          </span>
                                          <span>{formatBytesPerSecond(storageWrite ?? undefined)}</span>
                                        </span>
                                      </span>
                                    </div>
                                    <SparklineChart
                                      height={40}
                                      series={[
                                        {
                                          data: trendBlock.storageRead,
                                          strokeClass: 'text-sky-500 dark:text-sky-400',
                                        },
                                        {
                                          data: trendBlock.storageWrite,
                                          strokeClass: 'text-amber-500 dark:text-amber-400',
                                        },
                                      ]}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
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
          {dockerStatus?.compose_errors && (
            <div className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {dockerStatus.compose_errors}
            </div>
          )}

          {showServicesSkeleton && (
            <>
              <div className="hidden lg:block border border-border/60 bg-background/90">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[56px]" />
                      <col className="w-[220px]" />
                      <col className="w-[130px]" />
                      <col className="w-[130px]" />
                      <col className="w-[140px]" />
                      <col className="w-[140px]" />
                      <col className="w-[90px]" />
                    </colgroup>
                    <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="border-l border-border/60 px-3 py-3 text-center font-semibold first:border-l-0">
                          <span className="sr-only">Status</span>
                        </th>
                        <th className="border-l border-border/60 px-4 py-3 text-left font-semibold">Service</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">CPU</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Memory</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Net In/Out</th>
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
                  <table className="w-full min-w-[960px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[56px]" />
                      <col className="w-[220px]" />
                      <col className="w-[130px]" />
                      <col className="w-[130px]" />
                      <col className="w-[140px]" />
                      <col className="w-[140px]" />
                      <col className="w-[90px]" />
                    </colgroup>
                    <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="border-l border-border/60 px-3 py-3 text-center font-semibold first:border-l-0">
                          <span className="sr-only">Status</span>
                        </th>
                        <th className="border-l border-border/60 px-4 py-3 text-left font-semibold">Service</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">CPU</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Memory</th>
                        <th className="border-l border-border/60 px-4 py-3 text-right font-semibold">Net In/Out</th>
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
                        const netIn = container?.net?.rx_bytes
                        const netOut = container?.net?.tx_bytes
                        const { read: blockRead, write: blockWrite } = getBlockReadWrite(container?.block)
                        const { read: blockSpeedRead, write: blockSpeedWrite } = getBlockSpeed(container?.block)
                        const hasNetSpeed =
                          typeof container?.net?.in_bps === 'number' ||
                          typeof container?.net?.out_bps === 'number'
                        const hasBlockSpeed =
                          typeof blockSpeedRead === 'number' || typeof blockSpeedWrite === 'number'
                        const netSpeedSplit = getSplitPercents(container?.net?.in_bps, container?.net?.out_bps)
                        const blockSpeedSplit = getSplitPercents(blockSpeedRead, blockSpeedWrite)
                        const netSplit = hasNetSpeed ? netSpeedSplit : getSplitPercents(netIn, netOut)
                        const blockSplit = hasBlockSpeed ? blockSpeedSplit : getSplitPercents(blockRead, blockWrite)
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
                                <span className="text-[10px] text-muted-foreground font-mono tabular-nums whitespace-nowrap leading-tight">
                                  {container && formatContainerNetSpeed(container.net) !== '—'
                                    ? `Speed ${formatContainerNetSpeed(container.net)}`
                                    : '—'}
                                </span>
                                {renderSplitBar(netSplit.read, netSplit.write, {
                                  readClass: IO_READ_CLASS,
                                  writeClass: IO_WRITE_CLASS,
                                })}
                              </div>
                            </td>
                            <td className="border-l border-border/60 px-4 py-4 align-top text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] font-semibold font-mono tabular-nums whitespace-nowrap leading-tight">
                                  {blockRead !== null || blockWrite !== null
                                    ? `R ${formatBytes(blockRead ?? undefined)} / W ${formatBytes(blockWrite ?? undefined)}`
                                    : '—'}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono tabular-nums whitespace-nowrap leading-tight">
                                  {blockSpeedRead !== null || blockSpeedWrite !== null
                                    ? `Speed ${formatBytesPerSecond(blockSpeedRead ?? undefined)} / ${formatBytesPerSecond(blockSpeedWrite ?? undefined)}`
                                    : '—'}
                                </span>
                                {renderSplitBar(blockSplit.read, blockSplit.write, {
                                  readClass: IO_READ_CLASS,
                                  writeClass: IO_WRITE_CLASS,
                                })}
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
                  const netIn = container?.net?.rx_bytes
                  const netOut = container?.net?.tx_bytes
                  const { read: blockRead, write: blockWrite } = getBlockReadWrite(container?.block)
                  const { read: blockSpeedRead, write: blockSpeedWrite } = getBlockSpeed(container?.block)
                  const hasNetSpeed =
                    typeof container?.net?.in_bps === 'number' ||
                    typeof container?.net?.out_bps === 'number'
                  const hasBlockSpeed =
                    typeof blockSpeedRead === 'number' || typeof blockSpeedWrite === 'number'
                  const netSpeedSplit = getSplitPercents(container?.net?.in_bps, container?.net?.out_bps)
                  const blockSpeedSplit = getSplitPercents(blockSpeedRead, blockSpeedWrite)
                  const netSplit = hasNetSpeed ? netSpeedSplit : getSplitPercents(netIn, netOut)
                  const blockSplit = hasBlockSpeed ? blockSpeedSplit : getSplitPercents(blockRead, blockWrite)
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
                          <span className="uppercase tracking-[0.2em]">Net In/Out</span>
                          <span className="text-[11px] font-mono tabular-nums whitespace-nowrap leading-tight">
                            {container ? formatContainerNet(container.net) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-muted-foreground">
                          <span className="uppercase tracking-[0.2em]">Speed</span>
                          <span>{container ? formatContainerNetSpeed(container.net) : '—'}</span>
                        </div>
                        {renderSplitBar(netSplit.read, netSplit.write, {
                          readClass: IO_READ_CLASS,
                          writeClass: IO_WRITE_CLASS,
                        })}
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
                        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-muted-foreground">
                          <span className="uppercase tracking-[0.2em]">Speed</span>
                          <span>
                            {blockSpeedRead !== null || blockSpeedWrite !== null
                              ? `R ${formatBytesPerSecond(blockSpeedRead ?? undefined)} / W ${formatBytesPerSecond(blockSpeedWrite ?? undefined)}`
                              : '—'}
                          </span>
                        </div>
                        {renderSplitBar(blockSplit.read, blockSplit.write, {
                          readClass: IO_READ_CLASS,
                          writeClass: IO_WRITE_CLASS,
                        })}
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
