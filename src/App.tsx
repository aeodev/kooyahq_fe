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

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<PublicRoute><AuthLayout><Auth /></AuthLayout></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><AuthLayout><Auth /></AuthLayout></PublicRoute>} />

          {/* Dashboard routes */}
          <Route path="/" element={<PrivateRoute fallback={null}><DashboardLayout><Home /></DashboardLayout></PrivateRoute>} />
          <Route path="/workspace" element={<PrivateRoute fallback={null}><DashboardLayout><Workspace /></DashboardLayout></PrivateRoute>} />
          <Route path="/workspace/:boardId" element={<PrivateRoute fallback={null}><DashboardLayout><BoardView /></DashboardLayout></PrivateRoute>} />
          <Route path="/workspace/:boardId/:ticketId" element={<PrivateRoute fallback={null}><DashboardLayout><TicketDetailPage /></DashboardLayout></PrivateRoute>} />
          <Route path="/time-tracker" element={<PrivateRoute fallback={null}><DashboardLayout><TimeTracker /></DashboardLayout></PrivateRoute>} />
          <Route path="/gallery" element={<PrivateRoute fallback={null}><DashboardLayout><Gallery /></DashboardLayout></PrivateRoute>} />
          <Route path="/ai-news" element={<PrivateRoute fallback={null}><DashboardLayout><AINews /></DashboardLayout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute fallback={null}><DashboardLayout><Profile /></DashboardLayout></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute fallback={null}><DashboardLayout><Notifications /></DashboardLayout></PrivateRoute>} />
          <Route path="/feed" element={<PrivateRoute fallback={null}><DashboardLayout><KooyaFeed /></DashboardLayout></PrivateRoute>} />
          <Route path="/games" element={<PrivateRoute fallback={null}><DashboardLayout><Games /></DashboardLayout></PrivateRoute>} />
          <Route path="/games/play/:gameType" element={<PrivateRoute fallback={null}><DashboardLayout><PlayGame /></DashboardLayout></PrivateRoute>} />
          <Route path="/presence" element={<PrivateRoute fallback={null}><DashboardLayout><Presence /></DashboardLayout></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute fallback={null}><AdminRoute><DashboardLayout><Admin /></DashboardLayout></AdminRoute></PrivateRoute>} />
          <Route path="/meet" element={<PrivateRoute fallback={null}><DashboardLayout><MeetLanding /></DashboardLayout></PrivateRoute>} />
          <Route path="/meet/:meetId/join" element={<PrivateRoute fallback={null}><DashboardLayout><Meet /></DashboardLayout></PrivateRoute>} />
          <Route path="/meet/:meetId" element={<PrivateRoute fallback={null}><PreJoin /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  )
}
export default App
