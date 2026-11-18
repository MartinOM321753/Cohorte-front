import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  CalendarDays,
  Tag,
  FileSpreadsheet,
  Hash,
  Globe,
  Mail,
  ChevronRight,
} from 'lucide-react'
import { PermisoGuard } from '@/components/routes/PermisoGuard'

interface ConfigCardProps {
  to: string
  icon: React.ElementType
  title: string
  description: string
  section: string
}

function ConfigCard({ to, icon: Icon, title, description, section }: ConfigCardProps) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:border-[var(--imss-green-300)] hover:bg-[var(--imss-green-50)] hover:shadow-sm"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--imss-green-100)] text-[var(--imss-green-600)] transition-colors group-hover:bg-[var(--imss-green-200,var(--imss-green-100))]">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          {section}
        </p>
        <h3 className="mt-0.5 text-[14px] font-semibold text-[var(--card-foreground)] group-hover:text-[var(--imss-green-500)]">
          {title}
        </h3>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
      <ChevronRight className="mt-3 h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--imss-green-500)]" strokeWidth={1.75} />
    </Link>
  )
}

export default function ConfiguracionPage() {
  return (
    <div className="page-wrapper space-y-6">
      <div className="section-header">
        <h1 className="section-title">Configuración</h1>
        <p className="section-subtitle">
          Configuración del sistema y ajustes generales de la aplicación
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Acceso restringido a administradores. Los cambios aquí afectan a todo el sistema.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* ═══ Citas ═══ */}
        <ConfigCard
          to="/configuracion/citas"
          icon={CalendarDays}
          section="Citas"
          title="Horarios y motivos"
          description="Horarios disponibles para agendar y motivos predefinidos de cita."
        />

        {/* ═══ Impresión ═══ */}
        <ConfigCard
          to="/configuracion/etiquetas"
          icon={Tag}
          section="Impresión"
          title="Configuración de etiquetas"
          description="Tamaños de etiqueta y disposición de la información."
        />
        <ConfigCard
          to="/configuracion/etiquetas-libres"
          icon={FileSpreadsheet}
          section="Impresión"
          title="Etiquetas desde archivo"
          description="Imprima etiquetas a partir de un archivo Excel o CSV."
        />
        <ConfigCard
          to="/configuracion/folios"
          icon={Hash}
          section="Impresión"
          title="Imprimir folios"
          description="Etiquetas con folio codificado en QR, DataMatrix o Code 128."
        />

        {/* ═══ Sitio público ═══ */}
        <PermisoGuard permiso="DOCUMENTOS_PUBLICOS_GESTIONAR">
          <ConfigCard
            to="/configuracion/documentos"
            icon={Globe}
            section="Sitio público"
            title="Documentos públicos"
            description="Documentos visibles en la página pública de la cohorte."
          />
        </PermisoGuard>
        <ConfigCard
          to="/configuracion/solicitudes"
          icon={Mail}
          section="Sitio público"
          title="Correos y solicitudes"
          description="Destinatarios de notificaciones y datos requeridos en solicitudes."
        />
      </div>
    </div>
  )
}
