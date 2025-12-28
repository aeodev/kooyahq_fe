export type Action = {
  id: string
  name: string
  description: string
  command: string
  dangerous?: boolean
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
  actions: Action[]
}

export type Project = {
  id: string
  name: string
  description: string
  emoji: string
  servers: Server[]
}
