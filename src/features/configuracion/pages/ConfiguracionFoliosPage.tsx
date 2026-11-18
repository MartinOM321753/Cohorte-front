import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import ImprimirFoliosPanel from '@/features/impresion-folios/components/ImprimirFoliosPanel'

export default function ConfiguracionFoliosPage() {
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
        <h1 className="section-title">Imprimir folios de participantes</h1>
        <p className="section-subtitle">
          Etiquetas con folio codificado en QR, DataMatrix o Code 128.
        </p>
      </div>

      <ImprimirFoliosPanel />
    </div>
  )
}
