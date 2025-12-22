import { useCallback, useEffect, useMemo, useState } from 'react'
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
  path?: string
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
  statusPath: string
  ecsCluster: string
  ecsService: string
  actions: Action[]
}

type RunOutputStatus = 'running' | 'success' | 'failure' | 'error'

type CliOutput = {
  runId: string
  actionName: string
  serverName: string
  host?: string
  commandPath?: string
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
  statusPath: '',
  ecsCluster: '',
  ecsService: '',
  actions: [],
}

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const createAction = (): Action => ({
  id: createId('action'),
  name: '',
  description: '',
  path: '',
  dangerous: false,
})

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

  const [serverModalOpen, setServerModalOpen] = useState(false)
  const [serverModalMode, setServerModalMode] = useState<'create' | 'edit'>('create')
  const [editingServerId, setEditingServerId] = useState<string | null>(null)
  const [serverForm, setServerForm] = useState<ServerFormState>(emptyServerForm)
  const [serverFormErrors, setServerFormErrors] = useState<ServerFormErrors>({})
  const [serverFormError, setServerFormError] = useState<string | null>(null)
  const [existingSshKey, setExistingSshKey] = useState<string | undefined>(undefined)
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
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusData, setStatusData] = useState<Record<string, string>>({})
  const [statusServerName, setStatusServerName] = useState('')

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

  const openCreateProject = () => {
    if (!canManage) return
    setProjectModalMode('create')
    setEditingProjectId(null)
    setProjectForm(emptyProjectForm)
    setProjectFormErrors({})
    setProjectFormError(null)
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
    setProjectModalOpen(true)
  }

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

      setProjectModalOpen(false)
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
    setExistingSshKey(undefined)
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
      statusPath: server.statusPath ?? '',
      ecsCluster: server.ecsCluster ?? '',
      ecsService: server.ecsService ?? '',
      actions: server.actions.map((action) => ({
        ...action,
        dangerous: action.dangerous ?? false,
      })),
    })
    setExistingSshKey(server.sshKey)
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
      statusPath: serverForm.statusPath.trim(),
      ecsCluster: serverForm.ecsCluster.trim(),
      ecsService: serverForm.ecsService.trim(),
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
        path: action.path.trim(),
      }

      const currentErrors: ActionErrors = {
        name: actionTrimmed.name ? undefined : 'Required',
        description: actionTrimmed.description ? undefined : 'Required',
        path: actionTrimmed.path ? undefined : 'Required',
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
      path: action.path.trim(),
      dangerous: action.dangerous ?? false,
    }))

    const payload = {
      name: trimmed.name,
      summary: trimmed.summary,
      host: trimmed.host,
      port: trimmed.port || undefined,
      user: trimmed.user || undefined,
      sshKey: trimmed.sshKey || existingSshKey,
      statusPath: trimmed.statusPath || undefined,
      ecsCluster: trimmed.ecsCluster || undefined,
      ecsService: trimmed.ecsService || undefined,
      actions: cleanedActions,
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
    setStatusError(null)
    setStatusData({})
    setStatusServerName('')
  }

  const openStatusModal = async (server: Server) => {
    if (!canUse) return
    setStatusServerName(server.name)
    setStatusModalOpen(true)
    setStatusLoading(true)
    setStatusError(null)
    setStatusData({})

    try {
      const response = await axiosInstance.post<{ status: string; data: { status: Record<string, string> } }>(
        GET_SERVER_STATUS(server.id)
      )
      const status = response.data?.data?.status ?? {}
      const normalized: Record<string, string> = {}
      Object.entries(status).forEach(([key, value]) => {
        normalized[key] = String(value)
      })
      setStatusData(normalized)
    } catch (error) {
      setStatusError(getErrorMessage(error, 'Unable to load server status'))
    } finally {
      setStatusLoading(false)
    }
  }

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
        `$ ${action.path}`,
        `Run ID: ${runId}`,
        socketConnected ? 'Awaiting output...' : 'Socket disconnected. Output may not stream.',
      ]

      setCliOutput({
        runId,
        actionName: action.name,
        serverName: server.name,
        host: server.host,
        commandPath: action.path,
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
          <div key={project.id} className={cardClassName}>
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

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/server-management/projects/${project.id}`)}
              >
                View
              </Button>
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditProject(project)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => openRemoveProject(project)}
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
          <div key={server.id} className={cardClassName}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{server.name}</h2>
              <p className="text-sm text-muted-foreground">{server.summary}</p>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Host</p>
                <p className="text-sm font-medium">{server.host}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/server-management/projects/${project.id}/servers/${server.id}`)}
              >
                View
              </Button>
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditServer(server)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => openRemoveServer(project.id, server)}
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
    const detailChips = [
      { label: 'Port', value: server.port },
      { label: 'User', value: server.user },
      { label: 'ECS Cluster', value: server.ecsCluster },
      { label: 'ECS Service', value: server.ecsService },
    ].filter((chip) => chip.value)

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
              {detailChips.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {detailChips.map((chip) => (
                    <Badge key={chip.label} variant="secondary" className="text-xs">
                      {chip.label}: {chip.value}
                    </Badge>
                  ))}
                </div>
              )}
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

      <Modal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} className="max-h-[85vh]">
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
                onClick={() => setProjectModalOpen(false)}
                aria-label="Close project modal"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {projectFormError && (
              <p className="text-sm text-destructive">{projectFormError}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="space-y-2">
                <label className="text-sm font-medium">Emoji</label>
                <Input
                  value={projectForm.emoji}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, emoji: e.target.value }))}
                  placeholder="🛰️"
                  className={cn(projectFormErrors.emoji && fieldErrorClass)}
                />
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
            <Button variant="outline" size="sm" onClick={() => setProjectModalOpen(false)}>
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
                  <Input
                    type="password"
                    value={serverForm.sshKey}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, sshKey: e.target.value }))}
                    placeholder={existingSshKey ? 'Stored (hidden)' : 'Optional'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Script Path</label>
                  <Input
                    value={serverForm.statusPath}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, statusPath: e.target.value }))}
                    placeholder="/opt/ops/scripts/status.sh"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ECS Cluster</label>
                  <Input
                    value={serverForm.ecsCluster}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, ecsCluster: e.target.value }))}
                    placeholder="cluster-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ECS Service</label>
                  <Input
                    value={serverForm.ecsService}
                    onChange={(e) => setServerForm((prev) => ({ ...prev, ecsService: e.target.value }))}
                    placeholder="service-name"
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
                    Action paths stay hidden in the UI, except inside this configuration form.
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
                          <label className="text-sm font-medium">Command Path</label>
                          <Input
                            value={action.path}
                            onChange={(e) => updateServerAction(action.id, { path: e.target.value })}
                            placeholder="/opt/ops/scripts/deploy.sh"
                            className={cn(actionError?.path && fieldErrorClass)}
                          />
                          {actionError?.path && (
                            <p className="text-xs text-destructive">{actionError.path}</p>
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

      <Modal open={statusModalOpen} onClose={closeStatusModal} maxWidth="lg">
        <div className="flex h-full flex-col">
          <div className="border-b border-border/60 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Server Status</h2>
                <p className="text-sm text-muted-foreground">{statusServerName || 'Status snapshot'}</p>
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
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {statusLoading && (
              <p className="text-sm text-muted-foreground">Loading status...</p>
            )}
            {!statusLoading && statusError && (
              <p className="text-sm text-destructive">{statusError}</p>
            )}
            {!statusLoading && !statusError && Object.keys(statusData).length === 0 && (
              <p className="text-sm text-muted-foreground">No status entries returned.</p>
            )}
            {!statusLoading && !statusError && Object.keys(statusData).length > 0 && (
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
              <pre className="rounded-2xl border border-border/60 bg-slate-950 text-slate-100 p-4 text-sm leading-relaxed font-mono">
                {cliOutput.lines.join('\n')}
              </pre>
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
