import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { DashboardLayout } from '@/components/layout/MainLayout'
import { ThemeProvider } from '@/composables/useTheme'
import { Home } from '@/pages/Home'
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
import { Admin } from '@/pages/Admin'
import { Presence } from '@/pages/Presence'
import { Meet } from '@/pages/Meet'
import { MeetLanding } from '@/pages/Meet/Landing'
import { PreJoin } from '@/pages/Meet/PreJoin'
import { PrivateRoute } from '@/routes/PrivateRoute'
import { PublicRoute } from '@/routes/PublicRoute'
import { AdminRoute } from '@/routes/AdminRoute'
import { Toaster } from 'sonner'
import { BoardView } from './pages/Workspace/BoardView'
import { PERMISSIONS } from '@/constants/permissions'
import { PermissionGate } from '@/components/auth/PermissionGate'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
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
                  anyOf={[PERMISSIONS.WORKSPACE_FULL_ACCESS, PERMISSIONS.BOARD_FULL_ACCESS]}
                  allOf={[PERMISSIONS.WORKSPACE_READ, PERMISSIONS.BOARD_READ]}
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
                  anyOf={[PERMISSIONS.BOARD_FULL_ACCESS, PERMISSIONS.TICKET_FULL_ACCESS]}
                  allOf={[PERMISSIONS.BOARD_READ, PERMISSIONS.TICKET_READ]}
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
                  anyOf={[PERMISSIONS.TICKET_FULL_ACCESS, PERMISSIONS.BOARD_FULL_ACCESS]}
                  allOf={[PERMISSIONS.TICKET_READ]}
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
                <PermissionGate anyOf={[PERMISSIONS.TIME_ENTRY_FULL_ACCESS]} allOf={[PERMISSIONS.TIME_ENTRY_READ]}>
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
                <PermissionGate anyOf={[PERMISSIONS.GALLERY_FULL_ACCESS]} allOf={[PERMISSIONS.GALLERY_READ]}>
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
                <PermissionGate anyOf={[PERMISSIONS.AI_NEWS_FULL_ACCESS]} allOf={[PERMISSIONS.AI_NEWS_READ]}>
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
                <PermissionGate anyOf={[PERMISSIONS.NOTIFICATION_FULL_ACCESS]} allOf={[PERMISSIONS.NOTIFICATION_READ]}>
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
                <PermissionGate anyOf={[PERMISSIONS.POST_FULL_ACCESS]} allOf={[PERMISSIONS.POST_READ]}>
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
                <PermissionGate anyOf={[PERMISSIONS.GAME_FULL_ACCESS]} allOf={[PERMISSIONS.GAME_READ]}>
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
                <PermissionGate anyOf={[PERMISSIONS.GAME_FULL_ACCESS]} allOf={[PERMISSIONS.GAME_PLAY]}>
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
                <PermissionGate anyOf={[PERMISSIONS.PRESENCE_FULL_ACCESS]} allOf={[PERMISSIONS.PRESENCE_READ]}>
                  <DashboardLayout>
                    <Presence />
                  </DashboardLayout>
                </PermissionGate>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute fallback={null}>
                <AdminRoute>
                  <DashboardLayout>
                    <Admin />
                  </DashboardLayout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/meet"
            element={
              <PrivateRoute fallback={null}>
                <PermissionGate anyOf={[PERMISSIONS.MEET_FULL_ACCESS]} allOf={[PERMISSIONS.MEET_TOKEN]}>
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
                <PermissionGate anyOf={[PERMISSIONS.MEET_FULL_ACCESS]} allOf={[PERMISSIONS.MEET_TOKEN]}>
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
                <PermissionGate anyOf={[PERMISSIONS.MEET_FULL_ACCESS]} allOf={[PERMISSIONS.MEET_TOKEN]}>
                  <PreJoin />
                </PermissionGate>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  )
}
export default App
