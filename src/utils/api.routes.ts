// Ensure BASE_URL always ends with /api
const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
  // Remove trailing slash if present
  const cleanUrl = url.replace(/\/$/, '')
  // Add /api if not already present
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
}

export const BASE_URL = getBaseUrl()

// Socket server - derived from BASE_URL (remove /api suffix)
export const SOCKET_SERVER = BASE_URL.replace(/\/api$/, '')

// Socket routes
export const SOCKET_TIME_ENTRIES = () => SOCKET_SERVER

// Socket event names - must match backend TimeEntrySocketEvents
export const SocketTimeEntriesEvents = {
  TIMER_STARTED: 'time-entry:timer-started',
  TIMER_STOPPED: 'time-entry:timer-stopped',
  TIMER_PAUSED: 'time-entry:timer-paused',
  TIMER_RESUMED: 'time-entry:timer-resumed',
  CREATED: 'time-entry:created',
  UPDATED: 'time-entry:updated',
  DELETED: 'time-entry:deleted',
  TIMER_HEARTBEAT: 'time-entry:timer-heartbeat',
} as const

export type SocketTimeEntriesEventsEnum = typeof SocketTimeEntriesEvents[keyof typeof SocketTimeEntriesEvents]

// Auth routes
export const SIGN_UP = () => `/auth/register`
export const SIGN_IN = () => `/auth/login`
export const SIGN_IN_WITH_GOOGLE = () => `/auth/google`
export const PROFILE = () => `/auth/me`

// User routes
export const GET_USERS = () => `/users`
export const CREATE_USER = () => `/users`
export const GET_USER_BY_ID = (userId: string) => `/users/${userId}`
export const UPDATE_EMPLOYEE = (userId: string) => `/users/${userId}`
export const DELETE_EMPLOYEE = (userId: string) => `/users/${userId}`
export const CREATE_CLIENT = () => `/users/clients`

// Workspace routes
export const GET_WORKSPACES = () => `/workspaces`
export const GET_WORKSPACE_BY_ID = (workspaceId: string) => `/workspaces/${workspaceId}`
export const CREATE_WORKSPACE = () => `/workspaces`
export const UPDATE_WORKSPACE = (workspaceId: string) => `/workspaces/${workspaceId}`
export const DELETE_WORKSPACE = (workspaceId: string) => `/workspaces/${workspaceId}`

// Board routes (global)
export const CREATE_BOARD = () => `/boards`
export const GET_BOARDS = (type?: 'kanban' | 'sprint') => {
  const base = `/boards`
  return type ? `${base}?type=${type}` : base
}
export const GET_MY_BOARDS = () => `/boards`
export const GET_BOARD_BY_ID = (boardId: string) => `/boards/${boardId}`
export const GET_BOARD_BY_KEY = (boardKey: string) => `/boards/key/${boardKey}`
export const UPDATE_BOARD = (boardId: string) => `/boards/${boardId}`
export const DELETE_BOARD = (boardId: string) => `/boards/${boardId}`
export const TOGGLE_BOARD_FAVORITE = (boardId: string) => `/boards/${boardId}/favorite`

// Ticket routes
export const CREATE_TICKET = (boardId: string) => `/boards/${boardId}/tickets`
export const GET_TICKETS_BY_BOARD = (boardId: string) => `/boards/${boardId}/tickets`
export const GET_TICKET_BY_ID = (ticketId: string) => `/tickets/${ticketId}`
export const GET_ASSIGNED_TICKETS = () => `/tickets/assigned`
export const UPDATE_TICKET = (ticketId: string) => `/tickets/${ticketId}`
export const DELETE_TICKET = (ticketId: string) => `/tickets/${ticketId}`
export const BULK_UPDATE_RANKS = (boardId: string) => `/boards/${boardId}/tickets/bulk-rank`
export const ADD_RELATED_TICKET = (ticketId: string) => `/tickets/${ticketId}/related-tickets`
export const REMOVE_RELATED_TICKET = (ticketId: string, relatedTicketId: string) => `/tickets/${ticketId}/related-tickets/${relatedTicketId}`


// Comment routes
export const CREATE_COMMENT = (ticketId: string) => `/tickets/${ticketId}/comments`
export const GET_COMMENTS_BY_TICKET = (ticketId: string) => `/tickets/${ticketId}/comments`
export const UPDATE_COMMENT = (commentId: string) => `/comments/${commentId}`
export const DELETE_COMMENT = (commentId: string) => `/comments/${commentId}`

// Time entry routes
export const GET_TIME_ENTRIES = () => `/time-entries`
export const GET_MY_TIME_ENTRIES = () => `/time-entries/me`
export const GET_MY_ENTRIES_BY_RANGE = (startDate: string, endDate: string) => `/time-entries/me/range?startDate=${startDate}&endDate=${endDate}`
export const GET_ANALYTICS = (startDate?: string, endDate?: string, userId?: string) => {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (userId) params.append('userId', userId)
  return `/time-entries/analytics?${params.toString()}`
}
export const GET_ACTIVE_TIMER = () => `/time-entries/timer/active`
export const START_TIMER = () => `/time-entries/timer/start`
export const ADD_TASK_TO_TIMER = () => `/time-entries/timer/add-task`
export const PAUSE_TIMER = () => `/time-entries/timer/pause`
export const RESUME_TIMER = () => `/time-entries/timer/resume`
export const STOP_TIMER = () => `/time-entries/timer/stop`
export const END_DAY = () => `/time-entries/timer/end-day`
export const GET_DAY_ENDED_STATUS = () => `/time-entries/timer/day-ended-status`
export const LOG_MANUAL_ENTRY = () => `/time-entries/manual`
export const UPDATE_TIME_ENTRY = (id: string) => `/time-entries/${id}`
export const DELETE_TIME_ENTRY = (id: string) => `/time-entries/${id}`

// Gallery routes (admin only)
export const GET_GALLERY_ITEMS = (params?: { page?: number; limit?: number; search?: string; sort?: string }) => {
  const query = new URLSearchParams()
  if (params?.page) query.append('page', params.page.toString())
  if (params?.limit) query.append('limit', params.limit.toString())
  if (params?.search) query.append('search', params.search)
  if (params?.sort) query.append('sort', params.sort)
  return `/gallery${query.toString() ? `?${query.toString()}` : ''}`
}
export const GET_GALLERY_ITEM = (id: string) => `/gallery/${id}`
export const CREATE_GALLERY_ITEM = () => `/gallery`
export const CREATE_GALLERY_MULTIPLE = () => `/gallery/multiple`
export const UPDATE_GALLERY_ITEM = (id: string) => `/gallery/${id}`
export const DELETE_GALLERY_ITEM = (id: string) => `/gallery/${id}`
export const DELETE_GALLERY_ITEMS_BATCH = () => `/gallery/batch`
export const APPROVE_GALLERY_ITEM = (id: string) => `/gallery/${id}/approve`

// AI News routes
export const GET_AI_NEWS = () => `/ai-news`

// Presence routes
export const GET_PRESENCE = () => `/presence`

// Cesium routes
export const GET_CESIUM_TOKEN = () => `/cesium/token`

// Profile routes
export const GET_PROFILE = () => `/users/profile`
export const UPDATE_PROFILE = () => `/users/profile`
export const GET_PROFILE_POSTS = () => `/posts/me`
export const CREATE_PROFILE_POST = () => `/posts`
export const UPDATE_POST = (postId: string) => `/posts/${postId}`
export const DELETE_POST = (postId: string) => `/posts/${postId}`
export const GET_ALL_POSTS = () => `/posts`

// Post comments routes
export const GET_POST_COMMENTS = (postId: string) => `/posts/${postId}/comments`
export const CREATE_POST_COMMENT = (postId: string) => `/posts/${postId}/comments`
export const UPDATE_POST_COMMENT = (commentId: string) => `/posts/comments/${commentId}`
export const DELETE_POST_COMMENT = (commentId: string) => `/posts/comments/${commentId}`

// Post reactions routes
export const GET_POST_REACTIONS = (postId: string) => `/posts/${postId}/reactions`
export const TOGGLE_POST_REACTION = (postId: string) => `/posts/${postId}/reactions`
export const DELETE_POST_REACTION = (reactionId: string) => `/posts/reactions/${reactionId}`

// Notifications routes
export const GET_NOTIFICATIONS = (unreadOnly?: boolean) => `/notifications${unreadOnly ? '?unreadOnly=true' : ''}`
export const GET_UNREAD_COUNT = () => `/notifications/unread-count`
export const MARK_NOTIFICATION_READ = (id: string) => `/notifications/${id}/read`
export const MARK_ALL_NOTIFICATIONS_READ = () => `/notifications/read-all`

// Games routes
export const GET_GAME_TYPES = () => `/games/types`
export const GET_ACTIVE_USERS = () => `/games/active-users`
export const GET_MY_MATCHES = () => `/games/matches/me`
export const GET_MY_ACTIVE_MATCHES = () => `/games/matches/me/active`
export const GET_MATCH = (matchId: string) => `/games/matches/${matchId}`
export const CREATE_MATCH = () => `/games/matches`
export const UPDATE_MATCH = (matchId: string) => `/games/matches/${matchId}`
export const GET_LEADERBOARD = (gameType: string, limit?: number) => `/games/leaderboard/${gameType}${limit ? `?limit=${limit}` : ''}`

// Announcements routes
export const GET_ANNOUNCEMENTS = (onlyActive?: boolean) => `/announcements${onlyActive !== false ? '?onlyActive=true' : ''}`
export const GET_ANNOUNCEMENT = (id: string) => `/announcements/${id}`
export const CREATE_ANNOUNCEMENT = () => `/announcements`
export const UPDATE_ANNOUNCEMENT = (id: string) => `/announcements/${id}`
export const DELETE_ANNOUNCEMENT = (id: string) => `/announcements/${id}`

// Projects routes
export const GET_PROJECTS = () => `/projects`
export const GET_PROJECT = (id: string) => `/projects/${id}`
export const CREATE_PROJECT = () => `/projects`
export const UPDATE_PROJECT = (id: string) => `/projects/${id}`
export const DELETE_PROJECT = (id: string) => `/projects/${id}`

// Server management routes
export const GET_SERVER_MANAGEMENT_PROJECTS = () => `/server-management/projects`
export const GET_SERVER_MANAGEMENT_PROJECT = (projectId: string) => `/server-management/projects/${projectId}`
export const CREATE_SERVER_MANAGEMENT_PROJECT = () => `/server-management/projects`
export const UPDATE_SERVER_MANAGEMENT_PROJECT = (projectId: string) => `/server-management/projects/${projectId}`
export const DELETE_SERVER_MANAGEMENT_PROJECT = (projectId: string) => `/server-management/projects/${projectId}`
export const CREATE_SERVER_MANAGEMENT_SERVER = (projectId: string) => `/server-management/projects/${projectId}/servers`
export const UPDATE_SERVER_MANAGEMENT_SERVER = (projectId: string, serverId: string) =>
  `/server-management/projects/${projectId}/servers/${serverId}`
export const DELETE_SERVER_MANAGEMENT_SERVER = (projectId: string, serverId: string) =>
  `/server-management/projects/${projectId}/servers/${serverId}`
export const CREATE_SERVER_MANAGEMENT_ACTION = (projectId: string, serverId: string) =>
  `/server-management/projects/${projectId}/servers/${serverId}/actions`
export const UPDATE_SERVER_MANAGEMENT_ACTION = (projectId: string, serverId: string, actionId: string) =>
  `/server-management/projects/${projectId}/servers/${serverId}/actions/${actionId}`
export const DELETE_SERVER_MANAGEMENT_ACTION = (projectId: string, serverId: string, actionId: string) =>
  `/server-management/projects/${projectId}/servers/${serverId}/actions/${actionId}`
export const RUN_SERVER_MANAGEMENT_ACTION = (serverId: string, actionId: string) =>
  `/server-management/servers/${serverId}/actions/${actionId}/run`
export const GET_SERVER_STATUS = (serverId: string) => `/server-management/servers/${serverId}/status`

export const SocketServerManagementEvents = {
  RUN_STARTED: 'server-management:run-started',
  RUN_OUTPUT: 'server-management:run-output',
  RUN_COMPLETED: 'server-management:run-completed',
  RUN_ERROR: 'server-management:run-error',
} as const

export type SocketServerManagementEventsEnum =
  typeof SocketServerManagementEvents[keyof typeof SocketServerManagementEvents]

// Meet routes
export const GET_LIVEKIT_TOKEN = () => `/meet/token`

// Media upload routes (for rich text editor)
export const UPLOAD_MEDIA = () => `/media/upload`
// User management routes
export const GET_USER_MANAGEMENT_STATS = () => `/user-management/stats`
export const GET_USER_MANAGEMENT_ACTIVITY = () => `/user-management/activity`
export const EXPORT_USERS = (format: 'csv' | 'json') => `/user-management/export/users?format=${format}`

// Settings routes
export const GET_THEME_SETTINGS = () => `/settings/theme`
export const UPDATE_THEME_SETTINGS = () => `/settings/theme`
