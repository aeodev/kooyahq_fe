export type ActionRisk = 'normal' | 'warning' | 'dangerous'

export type Action = {
  id: string
  name: string
  description: string
  command: string
  risk: ActionRisk
}

export type Service = {
  name: string
  serviceName: string
  actions: Action[]
}

export type Server = {
  id: string
  name: string
  summary: string
  host: string
  port?: string
  user?: string
  statusCommand?: string
  appDirectory?: string
  services: Service[]
}

export type Project = {
  id: string
  name: string
  description: string
  emoji: string
  servers: Server[]
}

// ============================================================================
// instancectl Status Response Types
// ============================================================================

// Memory metrics (instance and container)
export type InstanceMemory = {
  total_bytes: number
  used_bytes: number
  free_bytes: number
}

// Swap memory
export type InstanceSwap = {
  total_bytes: number
  used_bytes: number
  free_bytes: number
}

// CPU metrics
export type InstanceCpu = {
  total_percent: number
  used_percent: number
  free_percent: number
  cores?: Record<string, number>
  load_avg?: {
    '1m_percent': number
    '5m_percent': number
    '15m_percent': number
  }
  iowait_percent?: number
}

// Network speed
export type NetworkSpeed = {
  rx_bytes: number
  tx_bytes: number
}

// Network metrics
export type InstanceNetwork = {
  rx_total_bytes: number
  tx_total_bytes: number
  rx_total_errors?: number
  tx_total_errors?: number
  rx_total_drops?: number
  tx_total_drops?: number
  speed?: NetworkSpeed
  interfaces?: Record<
    string,
    {
      rx_bytes: number
      tx_bytes: number
    }
  >
}

// Storage speed
export type StorageSpeed = {
  read_bytes: number
  write_bytes: number
}

// Storage metrics
export type InstanceStorage = {
  total_bytes: number
  used_bytes: number
  free_bytes: number
  read_total_bytes: number
  write_total_bytes: number
  speed?: StorageSpeed
}

// Temperature sensor
export type TemperatureSensor = {
  zone: string
  label?: string
  temperature_celsius: number
}

// File descriptor stats
export type FileDescriptors = {
  allocated: number
  max: number
}

// GPU memory
export type GpuMemory = {
  total_bytes: number
  used_bytes: number
  free_bytes: number
}

// GPU utilization
export type GpuUtilization = {
  used_percent: number
  free_percent: number
}

// GPU metrics
export type GpuMetrics = {
  index: number
  name: string
  memory: GpuMemory
  utilization: GpuUtilization
  temperature_celsius?: number
  fan_percent?: number
  power_watts?: number
  power_limit_watts?: number
  speed?: {
    memory: {
      used_bytes: number
      free_bytes: number
    }
    utilization: {
      used_percent: number
    }
  }
}

// Docker container health values
export type ContainerHealth = 'starting' | 'running' | 'stopped' | 'restarting' | 'exited' | 'dead' | 'paused'

// Container CPU
export type ContainerCpu = {
  total_percent: number
  used_percent: number
  free_percent: number
}

// Container memory
export type ContainerMemory = {
  total_bytes: number
  used_bytes: number
  free_bytes: number
}

// Container network
export type ContainerNetwork = {
  rx_total_bytes: number
  tx_total_bytes: number
  speed?: NetworkSpeed
}

// Container storage
export type ContainerStorage = {
  read_total_bytes: number
  write_total_bytes: number
  speed?: StorageSpeed
}

// Docker container status
export type DockerContainer = {
  id: string
  health: ContainerHealth
  status: string
  cpu: ContainerCpu
  memory: ContainerMemory
  network: ContainerNetwork
  storage: ContainerStorage
}

// Instance status values
export type InstanceStatus = 'running' | 'down'

// Full instance data
export type InstanceData = {
  hostname: string
  status: InstanceStatus
  uptime_seconds: number
  process_count: number
  memory: InstanceMemory
  swap?: InstanceSwap
  cpu: InstanceCpu
  network: InstanceNetwork
  storage: InstanceStorage
  temperature?: TemperatureSensor[]
  file_descriptors?: FileDescriptors
  gpu?: GpuMetrics[]
}

// Docker data
export type DockerData = {
  compose_errors?: string | null
  containers: Record<string, DockerContainer>
}

// Full status payload from instancectl
export type InstancectlStatus = {
  timestamp: string
  instance: InstanceData
  docker: DockerData
}

// ============================================================================
// Alert Types (from system-status gateway)
// ============================================================================

export type RiskLevel = 'info' | 'warning' | 'danger' | 'critical'

export type OverallStatus =
  | 'healthy'
  | 'info'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'starting'
  | 'shutdown'
  | 'restarting'

export type InstanceAlert = {
  risk: RiskLevel
  category: 'cpu' | 'memory' | 'health' | 'system'
  type: string
  title: string
  message: string
  details?: {
    metric?: string
    value?: number
    threshold?: number
    threshold_type?: string
  }
}

export type ContainerAlert = {
  name: string
  risk: RiskLevel
  category: 'cpu' | 'memory' | 'health'
  type: string
  title: string
  message: string
  details?: {
    metric?: string
    value?: number
    threshold?: number
    health?: string
    status?: string
  }
}

export type HealthChange = {
  scope: 'instance' | 'container'
  name: string
  change_type: 'health_change' | 'new' | 'removed'
  from: string | null
  to: string | null
  risk: RiskLevel
  message: string
}

export type AlertSummary = {
  total: number
  by_risk: {
    critical: number
    danger: number
    warning: number
    info: number
  }
  has_critical: boolean
  has_danger: boolean
  has_warning: boolean
}

export type GatewayStatusPayload = {
  version: string
  timestamp: string
  event_type: 'status' | 'lifecycle'
  project: string
  status: OverallStatus
  container?: string

  server: {
    name: string
    hostname: string
    status: string
    uptime_seconds: number
    process_count: number
  }

  metrics?: {
    cpu: {
      current_percent: number | null
      average_15m_percent: number | null
      is_ready: boolean
    }
    memory: {
      current_percent: number | null
      average_15m_percent: number | null
      used_bytes: number
      total_bytes: number
      is_ready: boolean
    }
  }

  alert_summary: AlertSummary
  instance_alerts: InstanceAlert[]

  containers: {
    total: number
    running: number
    stopped: number
    restarting: number
    alerts: ContainerAlert[]
  }

  health_changes: HealthChange[]

  lifecycle?: {
    event: 'starting' | 'shutdown' | 'restarting'
    reason?: string
  }
}
