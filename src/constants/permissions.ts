export const PERMISSIONS = {
  SYSTEM_FULL_ACCESS: 'system:fullAccess',
  ADMIN_FULL_ACCESS: 'admin:fullAccess',
  ADMIN_READ: 'admin:read',
  ADMIN_EXPORT: 'admin:export',
  ADMIN_ACTIVITY_READ: 'admin-activity:read',

  USER_FULL_ACCESS: 'user:fullAccess',
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  BOARD_FULL_ACCESS: 'board:fullAccess',
  BOARD_READ: 'board:read',
  BOARD_CREATE: 'board:create',
  BOARD_UPDATE: 'board:update',
  BOARD_DELETE: 'board:delete',
  BOARD_FAVORITE: 'board:favorite',
  BOARD_ACTIVITY_READ: 'board-activity:read',
  SPRINT_MANAGE: 'sprint:manage',

  TICKET_FULL_ACCESS: 'ticket:fullAccess',
  TICKET_READ: 'ticket:read',
  TICKET_CREATE: 'ticket:create',
  TICKET_UPDATE: 'ticket:update',
  TICKET_DELETE: 'ticket:delete',
  TICKET_RANK: 'ticket:rank',
  TICKET_RELATION: 'ticket:relation',
  TICKET_COMMENT_READ: 'ticket-comment:read',
  TICKET_COMMENT_CREATE: 'ticket-comment:create',
  TICKET_COMMENT_UPDATE: 'ticket-comment:update',
  TICKET_COMMENT_DELETE: 'ticket-comment:delete',
  TICKET_ACTIVITY_READ: 'ticket-activity:read',

  PROJECT_FULL_ACCESS: 'project:fullAccess',
  PROJECT_READ: 'project:read',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',

  ANNOUNCEMENT_FULL_ACCESS: 'announcement:fullAccess',
  ANNOUNCEMENT_READ: 'announcement:read',
  ANNOUNCEMENT_CREATE: 'announcement:create',
  ANNOUNCEMENT_UPDATE: 'announcement:update',
  ANNOUNCEMENT_DELETE: 'announcement:delete',

  AI_NEWS_FULL_ACCESS: 'ai-news:fullAccess',
  AI_NEWS_READ: 'ai-news:read',
  AI_NEWS_REFRESH: 'ai-news:refresh',

  GALLERY_FULL_ACCESS: 'gallery:fullAccess',
  GALLERY_READ: 'gallery:read',
  GALLERY_CREATE: 'gallery:create',
  GALLERY_BULK_CREATE: 'gallery:bulkCreate',
  GALLERY_UPDATE: 'gallery:update',
  GALLERY_DELETE: 'gallery:delete',

  MEDIA_FULL_ACCESS: 'media:fullAccess',
  MEDIA_UPLOAD: 'media:upload',
  MEDIA_READ: 'media:read',
  MEDIA_DELETE: 'media:delete',

  POST_FULL_ACCESS: 'post:fullAccess',
  POST_READ: 'post:read',
  POST_CREATE: 'post:create',
  POST_UPDATE: 'post:update',
  POST_DELETE: 'post:delete',
  POST_COMMENT_READ: 'post-comment:read',
  POST_COMMENT_CREATE: 'post-comment:create',
  POST_COMMENT_UPDATE: 'post-comment:update',
  POST_COMMENT_DELETE: 'post-comment:delete',
  POST_REACT: 'post:react',
  POST_POLL_VOTE: 'post:pollVote',

  NOTIFICATION_FULL_ACCESS: 'notification:fullAccess',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_COUNT: 'notification:count',
  NOTIFICATION_UPDATE: 'notification:update',

  PRESENCE_FULL_ACCESS: 'presence:fullAccess',
  PRESENCE_READ: 'presence:read',
  PRESENCE_UPDATE: 'presence:update',

  MEET_FULL_ACCESS: 'meet:fullAccess',
  MEET_TOKEN: 'meet:token',

  TIME_ENTRY_FULL_ACCESS: 'time-entry:fullAccess',
  TIME_ENTRY_READ: 'time-entry:read',
  TIME_ENTRY_ANALYTICS: 'time-entry:analytics',
  TIME_ENTRY_CREATE: 'time-entry:create',
  TIME_ENTRY_UPDATE: 'time-entry:update',
  TIME_ENTRY_DELETE: 'time-entry:delete',

  GAME_FULL_ACCESS: 'game:fullAccess',
  GAME_READ: 'game:read',
  GAME_PLAY: 'game:play',
  GAME_INVITE: 'game:invite',
  GAME_CLEANUP: 'game:cleanup',

  LINK_PREVIEW_FETCH: 'link-preview:fetch',
  CESIUM_TOKEN: 'cesium:token',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const PERMISSION_LIST: { value: Permission; label: string; description?: string }[] = [
  // System / Admin
  { value: PERMISSIONS.SYSTEM_FULL_ACCESS, label: 'System Full Access', description: 'Grants every permission' },
  { value: PERMISSIONS.ADMIN_FULL_ACCESS, label: 'Admin Full Access' },
  { value: PERMISSIONS.ADMIN_READ, label: 'Admin Read' },
  { value: PERMISSIONS.ADMIN_EXPORT, label: 'Admin Export' },
  { value: PERMISSIONS.ADMIN_ACTIVITY_READ, label: 'Admin Activity Read' },

  // Users
  { value: PERMISSIONS.USER_FULL_ACCESS, label: 'User Full Access' },
  { value: PERMISSIONS.USER_READ, label: 'Read Users' },
  { value: PERMISSIONS.USER_CREATE, label: 'Create Users' },
  { value: PERMISSIONS.USER_UPDATE, label: 'Update Users' },
  { value: PERMISSIONS.USER_DELETE, label: 'Delete Users' },

  // Workspaces & Boards
  { value: PERMISSIONS.BOARD_FULL_ACCESS, label: 'Board Full Access' },
  { value: PERMISSIONS.BOARD_READ, label: 'Read Boards' },
  { value: PERMISSIONS.BOARD_CREATE, label: 'Create Boards' },
  { value: PERMISSIONS.BOARD_UPDATE, label: 'Update Boards' },
  { value: PERMISSIONS.BOARD_DELETE, label: 'Delete Boards' },
  { value: PERMISSIONS.BOARD_FAVORITE, label: 'Favorite Boards' },
  { value: PERMISSIONS.BOARD_ACTIVITY_READ, label: 'Board Activity Read' },
  { value: PERMISSIONS.SPRINT_MANAGE, label: 'Manage Sprints' },

  // Tickets
  { value: PERMISSIONS.TICKET_FULL_ACCESS, label: 'Ticket Full Access' },
  { value: PERMISSIONS.TICKET_READ, label: 'Read Tickets' },
  { value: PERMISSIONS.TICKET_CREATE, label: 'Create Tickets' },
  { value: PERMISSIONS.TICKET_UPDATE, label: 'Update Tickets' },
  { value: PERMISSIONS.TICKET_DELETE, label: 'Delete Tickets' },
  { value: PERMISSIONS.TICKET_RANK, label: 'Rank Tickets' },
  { value: PERMISSIONS.TICKET_RELATION, label: 'Manage Ticket Relations' },
  { value: PERMISSIONS.TICKET_COMMENT_READ, label: 'Read Ticket Comments' },
  { value: PERMISSIONS.TICKET_COMMENT_CREATE, label: 'Create Ticket Comments' },
  { value: PERMISSIONS.TICKET_COMMENT_UPDATE, label: 'Update Ticket Comments' },
  { value: PERMISSIONS.TICKET_COMMENT_DELETE, label: 'Delete Ticket Comments' },
  { value: PERMISSIONS.TICKET_ACTIVITY_READ, label: 'Ticket Activity Read' },

  // Projects
  { value: PERMISSIONS.PROJECT_FULL_ACCESS, label: 'Project Full Access' },
  { value: PERMISSIONS.PROJECT_READ, label: 'Read Projects' },
  { value: PERMISSIONS.PROJECT_CREATE, label: 'Create Projects' },
  { value: PERMISSIONS.PROJECT_UPDATE, label: 'Update Projects' },
  { value: PERMISSIONS.PROJECT_DELETE, label: 'Delete Projects' },

  // Announcements
  { value: PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS, label: 'Announcement Full Access' },
  { value: PERMISSIONS.ANNOUNCEMENT_READ, label: 'Read Announcements' },
  { value: PERMISSIONS.ANNOUNCEMENT_CREATE, label: 'Create Announcements' },
  { value: PERMISSIONS.ANNOUNCEMENT_UPDATE, label: 'Update Announcements' },
  { value: PERMISSIONS.ANNOUNCEMENT_DELETE, label: 'Delete Announcements' },

  // AI News
  { value: PERMISSIONS.AI_NEWS_FULL_ACCESS, label: 'AI News Full Access' },
  { value: PERMISSIONS.AI_NEWS_READ, label: 'Read AI News' },
  { value: PERMISSIONS.AI_NEWS_REFRESH, label: 'Refresh AI News' },

  // Gallery / Media
  { value: PERMISSIONS.GALLERY_FULL_ACCESS, label: 'Gallery Full Access' },
  { value: PERMISSIONS.GALLERY_READ, label: 'Read Gallery' },
  { value: PERMISSIONS.GALLERY_CREATE, label: 'Create Gallery Items' },
  { value: PERMISSIONS.GALLERY_BULK_CREATE, label: 'Bulk Create Gallery' },
  { value: PERMISSIONS.GALLERY_UPDATE, label: 'Update Gallery Items' },
  { value: PERMISSIONS.GALLERY_DELETE, label: 'Delete Gallery Items' },
  { value: PERMISSIONS.MEDIA_FULL_ACCESS, label: 'Media Full Access' },
  { value: PERMISSIONS.MEDIA_UPLOAD, label: 'Upload Media' },
  { value: PERMISSIONS.MEDIA_READ, label: 'Read Media' },
  { value: PERMISSIONS.MEDIA_DELETE, label: 'Delete Media' },

  // Posts / Feed
  { value: PERMISSIONS.POST_FULL_ACCESS, label: 'Post Full Access' },
  { value: PERMISSIONS.POST_READ, label: 'Read Posts' },
  { value: PERMISSIONS.POST_CREATE, label: 'Create Posts' },
  { value: PERMISSIONS.POST_UPDATE, label: 'Update Posts' },
  { value: PERMISSIONS.POST_DELETE, label: 'Delete Posts' },
  { value: PERMISSIONS.POST_COMMENT_READ, label: 'Read Post Comments' },
  { value: PERMISSIONS.POST_COMMENT_CREATE, label: 'Create Post Comments' },
  { value: PERMISSIONS.POST_COMMENT_UPDATE, label: 'Update Post Comments' },
  { value: PERMISSIONS.POST_COMMENT_DELETE, label: 'Delete Post Comments' },
  { value: PERMISSIONS.POST_REACT, label: 'React to Posts' },
  { value: PERMISSIONS.POST_POLL_VOTE, label: 'Vote in Polls' },

  // Notifications / Presence / Meet
  { value: PERMISSIONS.NOTIFICATION_FULL_ACCESS, label: 'Notification Full Access' },
  { value: PERMISSIONS.NOTIFICATION_READ, label: 'Read Notifications' },
  { value: PERMISSIONS.NOTIFICATION_COUNT, label: 'Notification Count' },
  { value: PERMISSIONS.NOTIFICATION_UPDATE, label: 'Update Notifications' },
  { value: PERMISSIONS.PRESENCE_FULL_ACCESS, label: 'Presence Full Access' },
  { value: PERMISSIONS.PRESENCE_READ, label: 'Presence Read' },
  { value: PERMISSIONS.PRESENCE_UPDATE, label: 'Presence Update' },
  { value: PERMISSIONS.MEET_FULL_ACCESS, label: 'Meet Full Access' },
  { value: PERMISSIONS.MEET_TOKEN, label: 'Meet Token' },

  // Time entries
  { value: PERMISSIONS.TIME_ENTRY_FULL_ACCESS, label: 'Time Entry Full Access' },
  { value: PERMISSIONS.TIME_ENTRY_READ, label: 'Read Time Entries' },
  { value: PERMISSIONS.TIME_ENTRY_ANALYTICS, label: 'Time Entry Analytics' },
  { value: PERMISSIONS.TIME_ENTRY_CREATE, label: 'Create Time Entries' },
  { value: PERMISSIONS.TIME_ENTRY_UPDATE, label: 'Update Time Entries' },
  { value: PERMISSIONS.TIME_ENTRY_DELETE, label: 'Delete Time Entries' },

  // Games
  { value: PERMISSIONS.GAME_FULL_ACCESS, label: 'Game Full Access' },
  { value: PERMISSIONS.GAME_READ, label: 'Read Games' },
  { value: PERMISSIONS.GAME_PLAY, label: 'Play Games' },
  { value: PERMISSIONS.GAME_INVITE, label: 'Invite to Games' },
  { value: PERMISSIONS.GAME_CLEANUP, label: 'Cleanup Games' },

  // Misc
  { value: PERMISSIONS.LINK_PREVIEW_FETCH, label: 'Fetch Link Previews' },
  { value: PERMISSIONS.CESIUM_TOKEN, label: 'Cesium Token' },
]
