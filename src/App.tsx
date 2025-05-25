import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoginPage } from '@/pages/LoginPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ScenarioEditorPage } from '@/pages/ScenarioEditorPage'
import { MapEditorPage } from '@/pages/MapEditorPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ThemeProvider } from '@/components/ThemeProvider'

function App() {
  const { initialize, loading } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="trpg-editor-theme">
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/project/:projectId/scenario/:scenarioId" element={
            <ProtectedRoute>
              <ScenarioEditorPage />
            </ProtectedRoute>
          } />
          <Route path="/project/:projectId/map/:mapId" element={
            <ProtectedRoute>
              <MapEditorPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App