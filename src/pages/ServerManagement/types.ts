export type Action = {
  id: string
  name: string
  description: string
  path: string
  dangerous?: boolean
}

export type Server = {
  id: string
  name: string
  summary: string
  host: string
  port?: string
  user?: string
  sshKey?: string
  statusPath?: string
  ecsCluster?: string
  ecsService?: string
  actions: Action[]
}

export type Project = {
  id: string
  name: string
  description: string
  emoji: string
  servers: Server[]
}
