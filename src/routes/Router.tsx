import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ProtectedRoute } from '@/components/routes/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/pages/LoginPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import CambiarContrasenaPage from '@/features/auth/pages/CambiarContrasenaPage'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/authStore'

// Lazy load pages
const DashboardPage         = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const ExpedientePacientePage= lazy(() => import('@/features/pacientes/pages/ExpedientePacientePage'))
const PacientesPage    = lazy(() => import('@/features/pacientes/pages/PacientesPage'))
const EstudiosPage     = lazy(() => import('@/features/estudios/pages/EstudiosPage'))
const ExamenesPage     = lazy(() => import('@/features/examenes/pages/ExamenesPage'))
const BiobancoPage     = lazy(() => import('@/features/biobanco/pages/BiobancoPage'))
const CatalogosPage    = lazy(() => import('@/features/catalogos/pages/CatalogosPage'))
const ConfiguracionPage= lazy(() => import('@/features/configuracion/pages/ConfiguracionPage'))
const CitasPage        = lazy(() => import('@/features/citas/pages/CitasPage'))
const UsuariosPage     = lazy(() => import('@/features/usuarios/pages/UsuariosPage'))
const PerfilPage       = lazy(() => import('@/features/perfil/pages/PerfilPage'))
const BitacoraPage     = lazy(() => import('@/features/bitacora/pages/BitacoraPage'))
const EncargadoPage    = lazy(() => import('@/features/biobanco/pages/EncargadoPage'))
const UnauthorizedPage = lazy(() => import('@/features/errors/pages/UnauthorizedPage'))
const NotFoundPage     = lazy(() => import('@/features/errors/pages/NotFoundPage'))

import type { UserRole } from '@/stores/authStore'

/** Roles that belong to the main clinical/admin area (not ENCARGADO) */
const CLINICAL_ROLES: UserRole[] = ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'LABORATORISTA', 'PACIENTE']

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

/** Redirects to the correct home based on role after successful auth */
function RoleBasedHome() {
  const { hasRole } = useAuthStore()
  return <Navigate to={hasRole('ENCARGADO') ? '/mis-muestras' : '/dashboard'} replace />
}

export function AppRouter() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* Password change — requires auth but outside AppLayout */}
        <Route
          path="/cambiar-contrasena"
          element={
            <ProtectedRoute>
              <CambiarContrasenaPage />
            </ProtectedRoute>
          }
        />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Root → role-aware redirect */}
          <Route path="/" element={<RoleBasedHome />} />

          {/* ── ENCARGADO-only routes ── */}
          <Route
            path="/mis-muestras"
            element={
              <ProtectedRoute requiredRoles={['ENCARGADO']}>
                <Suspense fallback={<LoadingFallback />}>
                  <EncargadoPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* ── Clinical / admin routes (ENCARGADO blocked) ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRoles={CLINICAL_ROLES}>
                <Suspense fallback={<LoadingFallback />}>
                  <DashboardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR', 'RECEPCIONISTA']}>
                <Suspense fallback={<LoadingFallback />}>
                  <PacientesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          {/* Expediente 360 — accesible por todos los roles clínicos */}
          <Route
            path="/pacientes/expediente"
            element={
              <ProtectedRoute requiredRoles={CLINICAL_ROLES}>
                <Suspense fallback={<LoadingFallback />}>
                  <ExpedientePacientePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudios"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR', 'RECEPCIONISTA']}>
                <Suspense fallback={<LoadingFallback />}>
                  <EstudiosPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examenes"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA']}>
                <Suspense fallback={<LoadingFallback />}>
                  <ExamenesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/biobanco"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR', 'MEDICO']}>
                <Suspense fallback={<LoadingFallback />}>
                  <BiobancoPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citas"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA']}>
                <Suspense fallback={<LoadingFallback />}>
                  <CitasPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalogos"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR']}>
                <Suspense fallback={<LoadingFallback />}>
                  <CatalogosPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR']}>
                <Suspense fallback={<LoadingFallback />}>
                  <ConfiguracionPage />
                </Suspense>
              </ProtectedRoute>
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
          <Route
            path="/perfil"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PerfilPage />
              </Suspense>
            }
          />
          <Route
            path="/bitacora"
            element={
              <ProtectedRoute requiredRoles={['ADMINISTRADOR']}>
                <Suspense fallback={<LoadingFallback />}>
                  <BitacoraPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  )
}
