import { useEffect } from 'react'
import { matchPath, useLocation } from 'react-router-dom'

type PageMeta = {
  title: string
  description: string
  tagline: string
  imagePath: string
}

const SITE_NAME = 'KooyaHQ'

const META: Record<string, PageMeta> = {
  login: {
    title: 'Log In | KooyaHQ',
    description: 'Sign in to access your team workspace and tools.',
    tagline: 'Secure access for teams.',
    imagePath: '/og/login.svg',
  },
  signup: {
    title: 'Sign Up | KooyaHQ',
    description: 'Create a KooyaHQ account and get started quickly.',
    tagline: 'Set up your team HQ.',
    imagePath: '/og/signup.svg',
  },
  home: {
    title: 'Home | KooyaHQ',
    description: 'Overview of tasks, updates, and recent activity.',
    tagline: 'Everything in one view.',
    imagePath: '/og/home.svg',
  },
  workspace: {
    title: 'Workspace | KooyaHQ',
    description: 'Plan work with boards, tickets, and status.',
    tagline: 'Plan and ship together.',
    imagePath: '/og/workspace.svg',
  },
  board: {
    title: 'Board | KooyaHQ',
    description: 'Board view for organizing tasks and flow.',
    tagline: 'Focus the work.',
    imagePath: '/og/board.svg',
  },
  ticket: {
    title: 'Ticket | KooyaHQ',
    description: 'Ticket details, status, and activity in one place.',
    tagline: 'Stay aligned on tasks.',
    imagePath: '/og/ticket.svg',
  },
  timeTracker: {
    title: 'Time Tracker | KooyaHQ',
    description: 'Track time, focus sessions, and daily summaries.',
    tagline: 'Time, clearly.',
    imagePath: '/og/time-tracker.svg',
  },
  gallery: {
    title: 'Gallery | KooyaHQ',
    description: 'Team images, uploads, and shared media.',
    tagline: 'Share the moments.',
    imagePath: '/og/gallery.svg',
  },
  aiNews: {
    title: 'AI News | KooyaHQ',
    description: 'Curated AI updates and quick reads.',
    tagline: 'Stay ahead.',
    imagePath: '/og/ai-news.svg',
  },
  profile: {
    title: 'Profile | KooyaHQ',
    description: 'Manage your account, preferences, and profile.',
    tagline: 'Your workspace identity.',
    imagePath: '/og/profile.svg',
  },
  notifications: {
    title: 'Notifications | KooyaHQ',
    description: 'Alerts, mentions, and important updates.',
    tagline: 'Nothing missed.',
    imagePath: '/og/notifications.svg',
  },
  feed: {
    title: 'Feed | KooyaHQ',
    description: 'Team posts, reactions, and conversations.',
    tagline: 'Stay connected.',
    imagePath: '/og/feed.svg',
  },
  games: {
    title: 'Games | KooyaHQ',
    description: 'Quick games and friendly challenges.',
    tagline: 'Break time together.',
    imagePath: '/og/games.svg',
  },
  playGame: {
    title: 'Play Game | KooyaHQ',
    description: 'Play a live game with teammates.',
    tagline: 'Ready, set, play.',
    imagePath: '/og/play-game.svg',
  },
  presence: {
    title: 'Presence | KooyaHQ',
    description: 'See who is online and active.',
    tagline: 'Know who is here.',
    imagePath: '/og/presence.svg',
  },
  userManagement: {
    title: 'User Management | KooyaHQ',
    description: 'Manage users, roles, and access.',
    tagline: 'Teams under control.',
    imagePath: '/og/user-management.svg',
  },
  serverManagement: {
    title: 'Server Management | KooyaHQ',
    description: 'Monitor servers, projects, and health.',
    tagline: 'Operate with confidence.',
    imagePath: '/og/server-management.svg',
  },
  systemManagement: {
    title: 'System Management | KooyaHQ',
    description: 'Platform settings and system controls.',
    tagline: 'Keep it running.',
    imagePath: '/og/system-management.svg',
  },
  meet: {
    title: 'Meet | KooyaHQ',
    description: 'Start or join meetings fast.',
    tagline: 'Meet fast.',
    imagePath: '/og/meet.svg',
  },
  meetJoin: {
    title: 'Meeting | KooyaHQ',
    description: 'Live meeting room for your team.',
    tagline: 'Live collaboration.',
    imagePath: '/og/meet-join.svg',
  },
  meetPreJoin: {
    title: 'Pre-Join | KooyaHQ',
    description: 'Check audio and video before joining.',
    tagline: 'Ready to join.',
    imagePath: '/og/meet-prejoin.svg',
  },
  meetFiles: {
    title: 'Meet Files | KooyaHQ',
    description: 'Recordings, files, and meeting history.',
    tagline: 'Meetings, archived.',
    imagePath: '/og/meet-files.svg',
  },
}

const ROUTE_META: Array<{ pattern: string; meta: PageMeta }> = [
  { pattern: '/login', meta: META.login },
  { pattern: '/signup', meta: META.signup },
  { pattern: '/workspace/:boardKey/:ticketKey', meta: META.ticket },
  { pattern: '/workspace/:boardKey', meta: META.board },
  { pattern: '/workspace', meta: META.workspace },
  { pattern: '/time-tracker', meta: META.timeTracker },
  { pattern: '/gallery', meta: META.gallery },
  { pattern: '/ai-news', meta: META.aiNews },
  { pattern: '/profile', meta: META.profile },
  { pattern: '/notifications', meta: META.notifications },
  { pattern: '/feed', meta: META.feed },
  { pattern: '/games/play/:gameType', meta: META.playGame },
  { pattern: '/games', meta: META.games },
  { pattern: '/presence', meta: META.presence },
  { pattern: '/user-management', meta: META.userManagement },
  { pattern: '/server-management/projects/:projectId/servers/:serverId', meta: META.serverManagement },
  { pattern: '/server-management/projects/:projectId', meta: META.serverManagement },
  { pattern: '/server-management', meta: META.serverManagement },
  { pattern: '/system-management', meta: META.systemManagement },
  { pattern: '/meet/files', meta: META.meetFiles },
  { pattern: '/meet/:meetId/join', meta: META.meetJoin },
  { pattern: '/meet/:meetId', meta: META.meetPreJoin },
  { pattern: '/meet', meta: META.meet },
  { pattern: '/', meta: META.home },
]

function setMetaByName(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setMetaByProperty(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

export function RouteMeta() {
  const location = useLocation()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const match = ROUTE_META.find((route) =>
      matchPath({ path: route.pattern, end: true }, location.pathname)
    )
    const meta = match?.meta ?? META.home
    const origin = window.location.origin
    const canonical = `${origin}${location.pathname || '/'}`
    const imageUrl = `${origin}${meta.imagePath}`

    document.title = meta.title
    setMetaByName('description', meta.description)
    setMetaByName('tagline', meta.tagline)

    setMetaByProperty('og:title', meta.title)
    setMetaByProperty('og:description', meta.description)
    setMetaByProperty('og:image', imageUrl)
    setMetaByProperty('og:url', canonical)
    setMetaByProperty('og:type', 'website')
    setMetaByProperty('og:site_name', SITE_NAME)

    setMetaByName('twitter:card', 'summary_large_image')
    setMetaByName('twitter:title', meta.title)
    setMetaByName('twitter:description', meta.description)
    setMetaByName('twitter:image', imageUrl)

    setCanonicalLink(canonical)
  }, [location.pathname])

  return null
}
