import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import HorariosConfigPanel from '../components/HorariosConfigPanel'
import MotivosCitaConfigPanel from '../components/MotivosCitaConfigPanel'

export default function ConfiguracionCitasPage() {
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
        <h1 className="section-title">Citas</h1>
        <p className="section-subtitle">
          Horarios disponibles y motivos predefinidos para las citas.
        </p>
      </div>

      <HorariosConfigPanel />
      <MotivosCitaConfigPanel />
    </div>
  )
}
