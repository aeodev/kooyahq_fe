export const PERMISSIONS = {
  SYSTEM_FULL_ACCESS: 'system:fullAccess',

  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',

  PROJECTS_VIEW: 'projects:view',
  PROJECTS_MANAGE: 'projects:manage',

  SYSTEM_LOGS: 'system:logs',

  SERVER_MANAGEMENT_VIEW: 'serverManagement:view',
  SERVER_MANAGEMENT_USE: 'serverManagement:use',
  SERVER_MANAGEMENT_ELEVATED_USE: 'serverManagement:elevatedUse',
  SERVER_MANAGEMENT_ACTION_NORMAL: 'serverManagement:actionNormal',
  SERVER_MANAGEMENT_ACTION_WARNING: 'serverManagement:actionWarning',
  SERVER_MANAGEMENT_ACTION_DANGEROUS: 'serverManagement:actionDangerous',
  SERVER_MANAGEMENT_STATUS_NOTIFY: 'serverManagement:statusNotify',
  SERVER_MANAGEMENT_MANAGE: 'serverManagement:manage',

  BOARD_FULL_ACCESS: 'board:fullAccess',
  BOARD_VIEW: 'board:view',
  BOARD_VIEW_ALL: 'board:viewAll',
  BOARD_CREATE: 'board:create',
  BOARD_UPDATE: 'board:update',
  BOARD_DELETE: 'board:delete',

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
  GALLERY_APPROVE: 'gallery:approve',

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

  COST_ANALYTICS_FULL_ACCESS: 'cost-analytics:fullAccess',
  COST_ANALYTICS_VIEW: 'cost-analytics:view',
  COST_ANALYTICS_EDIT: 'cost-analytics:edit',

  FINANCE_FULL_ACCESS: 'finance:fullAccess',
  FINANCE_VIEW: 'finance:view',
  FINANCE_EDIT: 'finance:edit',
  FINANCE_MANAGE_EMPLOYEE_COSTS: 'finance:manageEmployeeCosts',

  GAME_FULL_ACCESS: 'game:fullAccess',
  GAME_READ: 'game:read',
  GAME_PLAY: 'game:play',
  GAME_INVITE: 'game:invite',
  GAME_CLEANUP: 'game:cleanup',

  LINK_PREVIEW_FETCH: 'link-preview:fetch',
  CESIUM_TOKEN: 'cesium:token',

  AI_ASSISTANT_ACCESS: 'ai-assistant:access',

  SETTINGS_FULL_ACCESS: 'settings:fullAccess',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const PERMISSION_LIST: { value: Permission; label: string; description?: string }[] = [
  // System / Admin
  { value: PERMISSIONS.SYSTEM_FULL_ACCESS, label: 'System Full Access', description: 'Grants every permission' },

  // User management (global)
  { value: PERMISSIONS.USERS_VIEW, label: 'View Users', description: 'View user list and details' },
  { value: PERMISSIONS.USERS_MANAGE, label: 'Manage Users', description: 'Create, edit, and delete users' },
  { value: PERMISSIONS.PROJECTS_VIEW, label: 'View Projects' },
  { value: PERMISSIONS.PROJECTS_MANAGE, label: 'Manage Projects' },
  { value: PERMISSIONS.SYSTEM_LOGS, label: 'View System Logs', description: 'Access activity logs' },

  // Server management
  { value: PERMISSIONS.SERVER_MANAGEMENT_VIEW, label: 'Server Management View' },
  { value: PERMISSIONS.SERVER_MANAGEMENT_USE, label: 'Server Management Use' },
  { value: PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE, label: 'Server Management Elevated Use' },
  {
    value: PERMISSIONS.SERVER_MANAGEMENT_ACTION_NORMAL,
    label: 'Server Management Actions (Normal)',
    description: 'Run normal server actions',
  },
  {
    value: PERMISSIONS.SERVER_MANAGEMENT_ACTION_WARNING,
    label: 'Server Management Actions (Warning)',
    description: 'Run warning and normal server actions',
  },
  {
    value: PERMISSIONS.SERVER_MANAGEMENT_ACTION_DANGEROUS,
    label: 'Server Management Actions (Dangerous)',
    description: 'Run all server actions, including dangerous ones',
  },
  {
    value: PERMISSIONS.SERVER_MANAGEMENT_STATUS_NOTIFY,
    label: 'Server Management Status Alerts',
    description: 'Receive server status alert notifications and emails',
  },
  { value: PERMISSIONS.SERVER_MANAGEMENT_MANAGE, label: 'Server Management Manage' },

  // Workspaces & Boards
  { value: PERMISSIONS.BOARD_FULL_ACCESS, label: 'Board Full Access' },
  { value: PERMISSIONS.BOARD_VIEW, label: 'View Boards' },
  { value: PERMISSIONS.BOARD_VIEW_ALL, label: 'View All Boards' },
  { value: PERMISSIONS.BOARD_CREATE, label: 'Create Boards' },
  { value: PERMISSIONS.BOARD_UPDATE, label: 'Update Boards' },
  { value: PERMISSIONS.BOARD_DELETE, label: 'Delete Boards' },

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

  // Cost Analytics
  { value: PERMISSIONS.COST_ANALYTICS_FULL_ACCESS, label: 'Cost Analytics Full Access' },
  { value: PERMISSIONS.COST_ANALYTICS_VIEW, label: 'View Cost Analytics', description: 'View cost data, analytics, and live tracking' },
  { value: PERMISSIONS.COST_ANALYTICS_EDIT, label: 'Edit Cost Analytics', description: 'View plus export data and manage budgets' },

  // Finance
  { value: PERMISSIONS.FINANCE_FULL_ACCESS, label: 'Finance Full Access' },
  { value: PERMISSIONS.FINANCE_VIEW, label: 'View Finance', description: 'View expenses, employee costs, and financial summaries' },
  { value: PERMISSIONS.FINANCE_EDIT, label: 'Edit Finance', description: 'Create, edit, and delete expenses' },
  { value: PERMISSIONS.FINANCE_MANAGE_EMPLOYEE_COSTS, label: 'Manage Employee Costs', description: 'Manage employee cost assignments (salary, subscriptions, items)' },

  // Games
  { value: PERMISSIONS.GAME_FULL_ACCESS, label: 'Game Full Access' },
  { value: PERMISSIONS.GAME_READ, label: 'Read Games' },
  { value: PERMISSIONS.GAME_PLAY, label: 'Play Games' },
  { value: PERMISSIONS.GAME_INVITE, label: 'Invite to Games' },
  { value: PERMISSIONS.GAME_CLEANUP, label: 'Cleanup Games' },

  // Misc
  { value: PERMISSIONS.LINK_PREVIEW_FETCH, label: 'Fetch Link Previews' },
  { value: PERMISSIONS.CESIUM_TOKEN, label: 'Cesium Token' },

  // AI Assistant
  { value: PERMISSIONS.AI_ASSISTANT_ACCESS, label: 'AI Assistant Access', description: 'Use the Kooya AI assistant' },

  // Settings
  { value: PERMISSIONS.SETTINGS_FULL_ACCESS, label: 'Settings Full Access', description: 'Full control over system settings' },
  { value: PERMISSIONS.SETTINGS_VIEW, label: 'View Settings', description: 'View system settings' },
  { value: PERMISSIONS.SETTINGS_MANAGE, label: 'Manage Settings', description: 'Change theme and other settings' },
]
