import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { DashboardLayout } from '@/components/layout/MainLayout'
import { ThemeProvider } from '@/composables/useTheme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min before refetch
      gcTime: Infinity, // Never garbage collect cache
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      retry: 1,
    },
  },
})
import { Home } from '@/pages/Home/index.tsx'
import { Auth } from '@/pages/Auth'
import { TimeTracker } from '@/pages/TimeTracker'
import { Workspace } from '@/pages/Workspace'
import { TicketDetailPage } from '@/pages/Workspace/BoardView/TicketDetailPage'
import { Gallery } from '@/pages/Gallery'
import { AINews } from '@/pages/AINews'
import { Profile } from '@/pages/Profile'
import { Notifications } from '@/pages/Notifications'
import { KooyaFeed } from '@/pages/KooyaFeed'
import { Games } from '@/pages/Games'
import { PlayGame } from '@/pages/Games/PlayGame'
import { UserManagement } from '@/pages/UserManagement'
import { ServerManagement } from '@/pages/ServerManagement'
import { SystemManagement } from '@/pages/SystemManagement'
import { Presence } from '@/pages/Presence'
import { Meet } from '@/pages/Meet'
import { MeetLanding } from '@/pages/Meet/Landing'
import { PreJoin } from '@/pages/Meet/PreJoin'
import { MeetFiles } from '@/pages/Meet/Files'
import { PrivateRoute } from '@/routes/PrivateRoute'
import { PublicRoute } from '@/routes/PublicRoute'
import { UserManagementRoute } from '@/routes/UserManagementRoute'
import { Toaster } from 'sonner'
import { BoardView } from './pages/Workspace/BoardView'
import { PERMISSIONS } from '@/constants/permissions'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { HeyKooya } from '@/components/ai-assistant/HeyKooya'
import { MeetInvitationToast } from '@/components/meet/MeetInvitationToast'
import { RouteMeta } from '@/components/RouteMeta'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <RouteMeta />
          <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<PublicRoute><AuthLayout><Auth /></AuthLayout></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><AuthLayout><Auth /></AuthLayout></PublicRoute>} />

          {/* Dashboard routes */}
          <Route
            path="/"
            element={
              <PrivateRoute fallback={null}>
                <DashboardLayout>
                  <Home />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/workspace"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.BOARD_VIEW,
                    PERMISSIONS.BOARD_VIEW_ALL,
                    PERMISSIONS.BOARD_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <Workspace />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/workspace/:boardKey"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.BOARD_VIEW,
                    PERMISSIONS.BOARD_VIEW_ALL,
                    PERMISSIONS.BOARD_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <BoardView />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/workspace/:boardKey/:ticketKey"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.BOARD_VIEW,
                    PERMISSIONS.BOARD_VIEW_ALL,
                    PERMISSIONS.BOARD_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <TicketDetailPage />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/time-tracker"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.TIME_ENTRY_READ,
                    PERMISSIONS.TIME_ENTRY_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <TimeTracker />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/gallery"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.GALLERY_READ,
                    PERMISSIONS.GALLERY_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <Gallery />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/ai-news"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.AI_NEWS_READ,
                    PERMISSIONS.AI_NEWS_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <AINews />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute fallback={null}>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.NOTIFICATION_READ,
                    PERMISSIONS.NOTIFICATION_FULL_ACCESS,
                    PERMISSIONS.NOTIFICATION_COUNT,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <Notifications />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.POST_READ,
                    PERMISSIONS.POST_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <KooyaFeed />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/games"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.GAME_READ,
                    PERMISSIONS.GAME_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <Games />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/games/play/:gameType"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.GAME_PLAY,
                    PERMISSIONS.GAME_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <PlayGame />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/presence"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.PRESENCE_READ,
                    PERMISSIONS.PRESENCE_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <Presence />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <PrivateRoute fallback={null}>
                <UserManagementRoute>
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </UserManagementRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/server-management"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.SERVER_MANAGEMENT_VIEW,
                    PERMISSIONS.SERVER_MANAGEMENT_USE,
                    PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE,
                    PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <ServerManagement />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/server-management/projects/:projectId"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.SERVER_MANAGEMENT_VIEW,
                    PERMISSIONS.SERVER_MANAGEMENT_USE,
                    PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE,
                    PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <ServerManagement />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/server-management/projects/:projectId/servers/:serverId"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.SERVER_MANAGEMENT_VIEW,
                    PERMISSIONS.SERVER_MANAGEMENT_USE,
                    PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE,
                    PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <ServerManagement />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/user-management" replace />} />
          <Route
            path="/system-management"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate anyOf={[PERMISSIONS.SYSTEM_FULL_ACCESS]}>
                  <DashboardLayout>
                    <SystemManagement />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/meet"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.MEET_TOKEN,
                    PERMISSIONS.MEET_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <MeetLanding />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/meet/:meetId/join"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.MEET_TOKEN,
                    PERMISSIONS.MEET_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <Meet />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/meet/:meetId"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.MEET_TOKEN,
                    PERMISSIONS.MEET_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <PreJoin />
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/meet/files"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate
                  anyOf={[
                    PERMISSIONS.MEET_TOKEN,
                    PERMISSIONS.MEET_FULL_ACCESS,
                    PERMISSIONS.SYSTEM_FULL_ACCESS,
                  ]}
                >
                  <DashboardLayout>
                    <MeetFiles />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
        </Routes>
        <MeetInvitationToast />
        </BrowserRouter>
        <Toaster />
        <HeyKooya />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
export default App
