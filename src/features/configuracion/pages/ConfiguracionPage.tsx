import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AlertCircle } from 'lucide-react'
import EtiquetasConfigPanel from '../components/EtiquetasConfigPanel'
import HorariosConfigPanel from '../components/HorariosConfigPanel'

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  return (
    <div className="page-wrapper space-y-6">
      <div className="section-header">
        <h1 className="section-title">Configuración</h1>
        <p className="section-subtitle">
          Configuración del sistema y ajustes generales de la aplicación
        </p>
      </div>

      <RoleGuard allowedRoles={['ADMINISTRADOR']}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Acceso restringido a administradores. Los cambios aquí afectan a todo el sistema.
          </AlertDescription>
        </Alert>

        {/* ── Configuración de horario de citas ── */}
        <HorariosConfigPanel />

        <Separator />

        {/* ── Configuración de etiquetas ── */}
        <EtiquetasConfigPanel />

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
              <CardDescription>Detalles de la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm space-y-2">
              <div><strong>Aplicación:</strong> IMSS Cohorte</div>
              <div><strong>Versión:</strong> 1.0.0</div>
              <div><strong>Ambiente:</strong> Desarrollo</div>
              <div><strong>Ambiente:</strong> {import.meta.env.MODE}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Parámetros globales</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Nombre de la institución<br />
              ✓ Logo y colores<br />
              ✓ Configuración regional<br />
              ✓ Zona horaria
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios y Permisos</CardTitle>
              <CardDescription>Gestión de accesos</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Crear y gestionar usuarios<br />
              ✓ Asignar roles<br />
              ✓ Resetear contraseñas<br />
              ✓ Desactivar cuentas
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Respaldo y Mantenimiento</CardTitle>
              <CardDescription>Operaciones administrativas</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Generar respaldos<br />
              ✓ Ver logs del sistema<br />
              ✓ Limpiar caché<br />
              ✓ Revisar estadísticas
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Backend</CardTitle>
            <CardDescription>Configuración de conexión</CardDescription>
          </CardHeader>
          <CardContent className="text-slate-600 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>URL API:</strong><br/>
                {import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}
              </div>
              <div>
                <strong>Estado:</strong><br/>
                <span className="text-green-600">✓ Conectado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </RoleGuard>
    </div>
  )
}
