import { Routes, Route, Navigate } from 'react-router-dom'
import { isAdmin } from './lib/supabase'

// Pages
import PublicLeaderboard from './pages/PublicLeaderboard'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import TeamManagement from './pages/TeamManagement'
import WeighmasterInterface from './pages/WeighmasterInterface'
import ResultsManagement from './pages/ResultsManagement'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  if (!isAdmin()) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLeaderboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teams"
        element={
          <ProtectedRoute>
            <TeamManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/weighin"
        element={
          <ProtectedRoute>
            <WeighmasterInterface />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/results"
        element={
          <ProtectedRoute>
            <ResultsManagement />
          </ProtectedRoute>
        }
      />
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
