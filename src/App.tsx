import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ThemeProvider } from '@/hooks/useTheme'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { TimeTracker } from '@/pages/TimeTracker'
import { BoardDetail } from '@/pages/Workspace/BoardDetail'
import { Workspace } from '@/pages/Workspace'
import { Gallery } from '@/pages/Gallery'
import { AINews } from '@/pages/AINews'
import { Profile } from '@/pages/Profile'
import { Notifications } from '@/pages/Notifications'
import { KooyaFeed } from '@/pages/KooyaFeed'
import { Games } from '@/pages/Games'
import { PlayGame } from '@/pages/Games/PlayGame'
import { AdminEmployees } from '@/pages/Admin/Employees'
import { PrivateRoute } from '@/routes/PrivateRoute'
import { PublicRoute } from '@/routes/PublicRoute'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
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
              path="/workspace/:boardId"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <BoardDetail />
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
              path="/admin/employees"
              element={
                <PrivateRoute fallback={null}>
                  <AppLayout>
                    <AdminEmployees />
                  </AppLayout>
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
