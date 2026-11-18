import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import CorreosSolicitudPanel from '../components/CorreosSolicitudPanel'
import SolicitudesDatosPanel from '../components/SolicitudesDatosPanel'

export default function ConfiguracionSolicitudesPage() {
  return (
    <div className="page-wrapper space-y-6">
      <div className="section-header">
        <Link
          to="/configuracion"
          className="mb-1 inline-flex items-center gap-1.5 text-[13px] text-[var(--imss-ink-400)] hover:text-[var(--imss-ink-700)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          Configuración
        </Link>
        <h1 className="section-title">Correos y solicitudes</h1>
        <p className="section-subtitle">
          Destinatarios de notificaciones y datos requeridos en solicitudes públicas.
        </p>
      </div>

      <CorreosSolicitudPanel />
      <SolicitudesDatosPanel />
    </div>
  )
}
