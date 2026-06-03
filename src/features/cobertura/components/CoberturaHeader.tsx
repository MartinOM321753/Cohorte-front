import { PageHeader } from '@/components/layout/PageHeader'
import type { CatalogoTipo } from '../types/cobertura.types'

interface Props {
  tipo:        CatalogoTipo
  onTipoChange: (t: CatalogoTipo) => void
}

export function CoberturaHeader({ tipo, onTipoChange }: Props) {
  return (
    <PageHeader
      title="Cobertura de cohorte"
      subtitle="Completitud del seguimiento por tipo de examen y estudio médico"
      actions={
        <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
          {(['EXAMEN', 'ESTUDIO'] as CatalogoTipo[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTipoChange(t)}
              className={[
                'px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                tipo === t
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {t === 'EXAMEN' ? 'Exámenes de lab.' : 'Estudios médicos'}
            </button>
          ))}
        </div>
      }
    />
  )
}
