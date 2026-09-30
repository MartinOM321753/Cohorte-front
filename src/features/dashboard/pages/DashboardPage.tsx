import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Beaker, TestTube } from 'lucide-react'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { useDashboardStats } from '../hooks/useDashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: stats, isLoading } = useDashboardStats()

  return (
    <div className="page-wrapper space-y-8">
      {/* Welcome Header */}
      <div className="section-header">
        <h1 className="section-title">
          Bienvenido, {user?.persona?.nombre || user?.username}
        </h1>
        <p className="section-subtitle">
          Sistema de Gestión de Investigación Clínica - IMSS Cohorte v1.0
        </p>
      </div>

      {/* Quick Stats */}
      <div className="card-grid">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Activos</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{stats?.pacientesActivos || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Pacientes en seguimiento activo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Programadas</CardTitle>
            <Calendar className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{stats?.citasProgramadas || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Para el mes actual
            </p>
          </CardContent>
        </Card>

        <RoleGuard allowedRoles={['MEDICO', 'ADMINISTRADOR']}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estudios Pendientes</CardTitle>
              <Beaker className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{stats?.estudiosPendientes || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Datos de evaluación
              </p>
            </CardContent>
          </Card>
        </RoleGuard>

        <RoleGuard allowedRoles={['LABORATORISTA', 'ADMINISTRADOR']}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Muestras en Biobanco</CardTitle>
              <TestTube className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{stats?.muestrasBiobanco || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Almacenadas correctamente
              </p>
            </CardContent>
          </Card>
        </RoleGuard>
      </div>



      {/* Role-based Content */}
      <div className="space-y-6">
        <RoleGuard allowedRoles={['ADMINISTRADOR']}>
          <Card>
            <CardHeader>
              <CardTitle>Panel Administrativo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Como administrador, tienes acceso a todas las funciones del sistema.
                Puedes gestionar usuarios, configurar parámetros del sistema y acceder
                a reportes completos.
              </p>
            </CardContent>
          </Card>
        </RoleGuard>

        <RoleGuard allowedRoles={['MEDICO']}>
          <Card>
            <CardHeader>
              <CardTitle>Funciones de Médico/Investigador</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Puedes registrar estudios médicos, agendar citas con pacientes,
                consultar resultados de exámenes y gestionar información clínica.
              </p>
            </CardContent>
          </Card>
        </RoleGuard>

        <RoleGuard allowedRoles={['LABORATORISTA']}>
          <Card>
            <CardHeader>
              <CardTitle>Funciones de Laboratorista</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Puedes gestionar exámenes de laboratorio, registrar muestras biológicas
                y administrar el biobanco (refrigeradores y cajas criogénicas).
              </p>
            </CardContent>
          </Card>
        </RoleGuard>

        <RoleGuard allowedRoles={['RECEPCIONISTA']}>
          <Card>
            <CardHeader>
              <CardTitle>Funciones de Recepcionista</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Puedes registrar nuevos pacientes, agendar citas y consultar
                información básica del sistema.
              </p>
            </CardContent>
          </Card>
        </RoleGuard>

        <RoleGuard allowedRoles={['PACIENTE']}>
          <Card>
            <CardHeader>
              <CardTitle>Mi Información</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Bienvenido. Puedes consultar tus citas programadas y resultados
                de exámenes e estudios realizados.
              </p>
            </CardContent>
          </Card>
        </RoleGuard>
      </div>
    </div>
  )
}
