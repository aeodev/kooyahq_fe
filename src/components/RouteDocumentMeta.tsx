import { useEffect } from 'react'
import { matchPath, useLocation } from 'react-router-dom'

type PageMeta = {
  title: string
  description: string
  tagline?: string
}

const META: Record<string, PageMeta> = {
  login: {
    title: 'Log In | KooyaHQ',
    description: 'Sign in to access your team workspace and tools.',
    tagline: 'Secure access for teams.',
  },
  signup: {
    title: 'Sign Up | KooyaHQ',
    description: 'Create a KooyaHQ account and get started quickly.',
    tagline: 'Set up your team HQ.',
  },
  terms: {
    title: 'Terms of Service | KooyaHQ',
    description: 'Review the KooyaHQ Terms of Service.',
    tagline: 'Legal terms.',
  },
  privacy: {
    title: 'Privacy Policy | KooyaHQ',
    description: 'Review the KooyaHQ Privacy Policy.',
    tagline: 'Privacy details.',
  },
  home: {
    title: 'Home | KooyaHQ',
    description: 'Overview of tasks, updates, and recent activity.',
    tagline: 'Everything in one view.',
  },
  workspace: {
    title: 'Workspace | KooyaHQ',
    description: 'Plan work with boards, tickets, and status.',
    tagline: 'Plan and ship together.',
  },
  board: {
    title: 'Board | KooyaHQ',
    description: 'Board view for organizing tasks and flow.',
    tagline: 'Focus the work.',
  },
  ticket: {
    title: 'Ticket | KooyaHQ',
    description: 'Ticket details, status, and activity in one place.',
    tagline: 'Stay aligned on tasks.',
  },
  timeTracker: {
    title: 'Time Tracker | KooyaHQ',
    description: 'Track time, focus sessions, and daily summaries.',
    tagline: 'Time, clearly.',
  },
  gallery: {
    title: 'Gallery | KooyaHQ',
    description: 'Team images, uploads, and shared media.',
    tagline: 'Share the moments.',
  },
  aiNews: {
    title: 'AI News | KooyaHQ',
    description: 'Curated AI updates and quick reads.',
    tagline: 'Stay ahead.',
  },
  profile: {
    title: 'Profile | KooyaHQ',
    description: 'Manage your account, preferences, and profile.',
    tagline: 'Your workspace identity.',
  },
  notifications: {
    title: 'Notifications | KooyaHQ',
    description: 'Alerts, mentions, and important updates.',
    tagline: 'Nothing missed.',
  },
  feed: {
    title: 'Feed | KooyaHQ',
    description: 'Team posts, reactions, and conversations.',
    tagline: 'Stay connected.',
  },
  games: {
    title: 'Games | KooyaHQ',
    description: 'Quick games and friendly challenges.',
    tagline: 'Break time together.',
  },
  playGame: {
    title: 'Play Game | KooyaHQ',
    description: 'Play a live game with teammates.',
    tagline: 'Ready, set, play.',
  },
  presence: {
    title: 'Presence | KooyaHQ',
    description: 'See who is online and active.',
    tagline: 'Know who is here.',
  },
  userManagement: {
    title: 'User Management | KooyaHQ',
    description: 'Manage users, roles, and access.',
    tagline: 'Teams under control.',
  },
  serverManagement: {
    title: 'Server Management | KooyaHQ',
    description: 'Monitor servers, projects, and health.',
    tagline: 'Operate with confidence.',
  },
  systemManagement: {
    title: 'System Management | KooyaHQ',
    description: 'Platform settings and system controls.',
    tagline: 'Keep it running.',
  },
  meet: {
    title: 'Meet | KooyaHQ',
    description: 'Start or join meetings fast.',
    tagline: 'Meet fast.',
  },
  meetJoin: {
    title: 'Meeting | KooyaHQ',
    description: 'Live meeting room for your team.',
    tagline: 'Live collaboration.',
  },
  meetPreJoin: {
    title: 'Pre-Join | KooyaHQ',
    description: 'Check audio and video before joining.',
    tagline: 'Ready to join.',
  },
  meetFiles: {
    title: 'Meet Files | KooyaHQ',
    description: 'Recordings, files, and meeting history.',
    tagline: 'Meetings, archived.',
  },
}

const ROUTE_META: Array<{ pattern: string; meta: PageMeta }> = [
  { pattern: '/login', meta: META.login },
  { pattern: '/signup', meta: META.signup },
  { pattern: '/terms', meta: META.terms },
  { pattern: '/privacy', meta: META.privacy },
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

function setCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

export function RouteDocumentMeta() {
  const location = useLocation()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const match = ROUTE_META.find((route) =>
      matchPath({ path: route.pattern, end: true }, location.pathname)
    )
    const meta = match?.meta ?? META.home
    const origin = window.location.origin
    const canonical = `${origin}${location.pathname || '/'}`

    document.title = meta.title
    setMetaByName('description', meta.description)
    if (meta.tagline) {
      setMetaByName('tagline', meta.tagline)
    }
    setCanonicalLink(canonical)
  }, [location.pathname])

  return null
}
