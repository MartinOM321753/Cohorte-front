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
const InstitucionesPage= lazy(() => import('@/features/instituciones/pages/InstitucionesPage'))
const PerfilPage       = lazy(() => import('@/features/perfil/pages/PerfilPage'))
const BitacoraAccesosPage  = lazy(() => import('@/features/bitacora/pages/BitacoraAccesosPage'))
const BitacoraAccionesPage = lazy(() => import('@/features/bitacora/pages/BitacoraAccionesPage'))
const CoberturaPage    = lazy(() => import('@/features/cobertura/pages/CoberturaPage'))
const DocumentoViewPage = lazy(() => import('@/features/documentos/pages/DocumentoViewPage'))
const PermisosPage     = lazy(() => import('@/features/permisos/pages/PermisosPage'))
const UnauthorizedPage = lazy(() => import('@/features/errors/pages/UnauthorizedPage'))
const NotFoundPage     = lazy(() => import('@/features/errors/pages/NotFoundPage'))

import { permisosFor, resolveHomeRoute } from '@/config/featurePermisos'

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

/** Redirects to the correct home based on permissions after successful auth */
function PermisoBasedHome() {
  const { hasPermiso } = useAuthStore()
  return <Navigate to={resolveHomeRoute(hasPermiso)} replace />
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

        {/* Visualización de documento por etiqueta (escaneo QR/barcode) — fuera de AppLayout */}
        <Route
          path="/documento"
          element={
            <ProtectedRoute requiredPermiso="DOCUMENTOS_DESCARGAR">
              <Suspense fallback={<LoadingFallback />}>
                <DocumentoViewPage />
              </Suspense>
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
          {/* Root → permission-aware redirect */}
          <Route path="/" element={<PermisoBasedHome />} />

          {/* ── Clinical / admin routes ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('dashboard')}>
                <Suspense fallback={<LoadingFallback />}>
                  <DashboardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('pacientes')}>
                <Suspense fallback={<LoadingFallback />}>
                  <PacientesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          {/* Expediente 360 — accesible si puede ver expediente */}
          <Route
            path="/pacientes/expediente"
            element={
              <ProtectedRoute requiredPermiso="EXPEDIENTE_VER">
                <Suspense fallback={<LoadingFallback />}>
                  <ExpedientePacientePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudios"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('estudios')}>
                <Suspense fallback={<LoadingFallback />}>
                  <EstudiosPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examenes"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('examenes')}>
                <Suspense fallback={<LoadingFallback />}>
                  <ExamenesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/biobanco"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('biobanco')}>
                <Suspense fallback={<LoadingFallback />}>
                  <BiobancoPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citas"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('citas')}>
                <Suspense fallback={<LoadingFallback />}>
                  <CitasPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cobertura"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('cobertura')}>
                <Suspense fallback={<LoadingFallback />}>
                  <CoberturaPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalogos"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('catalogos')}>
                <Suspense fallback={<LoadingFallback />}>
                  <CatalogosPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('configuracion')}>
                <Suspense fallback={<LoadingFallback />}>
                  <ConfiguracionPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('usuarios')}>
                <Suspense fallback={<LoadingFallback />}>
                  <UsuariosPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instituciones"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('instituciones')}>
                <Suspense fallback={<LoadingFallback />}>
                  <InstitucionesPage />
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
            path="/permisos"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('permisos')}>
                <Suspense fallback={<LoadingFallback />}>
                  <PermisosPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="/bitacora" element={<Navigate to="/bitacora/accesos" replace />} />
          <Route
            path="/bitacora/accesos"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('bitacoraAccesos')}>
                <Suspense fallback={<LoadingFallback />}>
                  <BitacoraAccesosPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bitacora/acciones"
            element={
              <ProtectedRoute requiredPermiso={permisosFor('bitacoraAcciones')}>
                <Suspense fallback={<LoadingFallback />}>
                  <BitacoraAccionesPage />
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
