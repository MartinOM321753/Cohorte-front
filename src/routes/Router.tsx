import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ProtectedRoute } from '@/components/routes/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/pages/LoginPage'
import { Spinner } from '@/components/ui/spinner'

// Lazy load pages
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const PacientesPage = lazy(() => import('@/features/pacientes/pages/PacientesPage'))
const EstudiosPage = lazy(() => import('@/features/estudios/pages/EstudiosPage'))
const BiobancoPage = lazy(() => import('@/features/biobanco/pages/BiobancoPage'))
const CatalogosPage = lazy(() => import('@/features/catalogos/pages/CatalogosPage'))
const ConfiguracionPage = lazy(() => import('@/features/configuracion/pages/ConfiguracionPage'))
const CitasPage = lazy(() => import('@/features/citas/pages/CitasPage'))
const UsuariosPage = lazy(() => import('@/features/usuarios/pages/UsuariosPage'))
const UnauthorizedPage = lazy(() => import('@/features/errors/pages/UnauthorizedPage'))
const NotFoundPage = lazy(() => import('@/features/errors/pages/NotFoundPage'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/pacientes"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PacientesPage />
              </Suspense>
            }
          />
          <Route
            path="/estudios"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <EstudiosPage />
              </Suspense>
            }
          />
          <Route
            path="/biobanco"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <BiobancoPage />
              </Suspense>
            }
          />
          <Route
            path="/citas"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CitasPage />
              </Suspense>
            }
          />
          <Route
            path="/catalogos"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CatalogosPage />
              </Suspense>
            }
          />
          <Route
            path="/configuracion"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ConfiguracionPage />
              </Suspense>
            }
          />  
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR']}>
                <Suspense fallback={<LoadingFallback />}>
                  <UsuariosPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch all - not found */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  )
}
