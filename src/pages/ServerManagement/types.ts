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
