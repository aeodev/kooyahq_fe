import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ThemeProvider } from '@/composables/useTheme'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { TimeTracker } from '@/pages/TimeTracker'
import { Workspace } from '@/pages/Workspace'
import { BoardView } from '@/pages/Workspace/BoardView'
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
import { ToastContainer } from '@/components/ui/toast'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastContainer />
          <Routes>
            <Route
              path="/"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Home />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/workspace"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Workspace />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/workspace/:boardKey"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <BoardView />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/workspace/:boardKey/:ticketKey"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <TicketDetailPage />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/time-tracker"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <TimeTracker />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/gallery"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Gallery />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/ai-news"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <AINews />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Notifications />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/feed"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <KooyaFeed />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/games"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Games />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/games/play/:gameType"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <PlayGame />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/presence"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Presence />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Admin />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/meet"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <MeetLanding />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/meet/:meetId/join"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <Meet />
                  </AppLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/meet/:meetId"
              element={
                <PrivateRoute fallback={null}>
                  <PreJoin />
                </PrivateRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <AppLayout>
                    <Login />
                  </AppLayout>
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <AppLayout>
                    <Signup />
                  </AppLayout>
                </PublicRoute>
              }
            />
          </Routes>
        </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
