import { useState } from 'react'
import type { CatalogoTipo } from '../types/cobertura.types'
import { useCobertura, useDistribucion, useGrupo, useMatriz, usePendientes } from '../hooks/useCobertura'
import { CoberturaHeader } from '../components/CoberturaHeader'
import { CoverturaTiles } from '../components/CoverturaTiles'
import { DistribucionHistograma } from '../components/DistribucionHistograma'
import { CoberturaBarras } from '../components/CoberturaBarras'
import { MatrizCobertura } from '../components/MatrizCobertura'
import { DrilldownPanel } from '../components/DrilldownPanel'
import { useGetInstitucionesParaRegistro } from '@/features/pacientes/hooks/useGetPacientes'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function CoberturaPage() {
  const [tipo, setTipo]           = useState<CatalogoTipo>('EXAMEN')
  const [selTipoId, setSelTipoId] = useState<number | null>(null)
  const [selBucket, setSelBucket] = useState<number | null>(null)

  // La cobertura se mide por sede: mezclar varios padrones en un solo porcentaje
  // escondería el pendiente de cada una, que es lo que el tablero debe mostrar.
  const [idInstitucion, setIdInstitucion] = useState<number | undefined>(undefined)
  const { data: instituciones = [] } = useGetInstitucionesParaRegistro()

  const handleSetTipo = (t: CatalogoTipo) => {
    setTipo(t)
    setSelTipoId(null)
    setSelBucket(null)
  }

  const { data: cobertura = [], isLoading: covL }   = useCobertura(tipo, idInstitucion)
  const { data: distribucion = [] }                 = useDistribucion(tipo, idInstitucion)
  const { data: matriz = [] }                       = useMatriz(tipo, idInstitucion)

  // Drilldown — pendientes de un tipo específico O grupo del histograma
  const { data: drillPendientes = [], isLoading: drillPL } = usePendientes(selTipoId, tipo, idInstitucion)
  const { data: drillGrupo = [],      isLoading: drillGL } = useGrupo(selBucket, tipo, idInstitucion)

  const drillData    = selTipoId !== null ? drillPendientes : drillGrupo
  const drillLoading = selTipoId !== null ? drillPL : drillGL

  // ── Cálculos para los tiles ──────────────────────────────────────────────
  const totalTipos       = distribucion.length > 0 ? distribucion[0].totalTipos : cobertura.length
  const pacientesActivos = cobertura.length > 0 ? cobertura[0].pacientesActivos : 0
  const completos        = distribucion.find(d => d.cantidadTipos === totalTipos)?.cantidadPacientes ?? 0
  const cero             = distribucion.find(d => d.cantidadTipos === 0)?.cantidadPacientes ?? 0
  const totalCeldas      = pacientesActivos * totalTipos
  const hechas           = cobertura.reduce((acc, c) => acc + c.conRegistro, 0)
  const pctGlobal        = totalCeldas > 0 ? Math.round((hechas / totalCeldas) * 100) : 0

  const tipoWord = tipo === 'EXAMEN' ? 'examen' : 'estudio'

  return (
    <div className="flex flex-col gap-5">
      {/* Header + conmutador */}
      <CoberturaHeader tipo={tipo} onTipoChange={handleSetTipo} />

      {instituciones.length > 1 && (
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <Label className="text-[12px] text-muted-foreground">Institución</Label>
          <Select
            value={idInstitucion != null ? String(idInstitucion) : 'propia'}
            onValueChange={(v) => {
              setIdInstitucion(v === 'propia' ? undefined : Number(v))
              setSelTipoId(null)
              setSelBucket(null)
            }}
          >
            <SelectTrigger className="h-9 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="propia">Mi institución</SelectItem>
              {instituciones.filter((i) => !i.propia).map((i) => (
                <SelectItem key={i.id} value={String(i.id)}>{i.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tiles de resumen */}
      <CoverturaTiles
        pacientesActivos={pacientesActivos}
        pctGlobal={pctGlobal}
        completos={completos}
        cero={cero}
        totalTipos={totalTipos}
        tipoWord={tipoWord}
        isLoading={covL}
      />

      {/* Histograma + Barras de cobertura */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DistribucionHistograma
          data={distribucion}
          selected={selBucket}
          onSelect={(k) => {
            setSelBucket(k === selBucket ? null : k)
            setSelTipoId(null)
          }}
        />
        <CoberturaBarras
          data={cobertura}
          selectedId={selTipoId}
          onSelect={(id) => {
            setSelTipoId(id === selTipoId ? null : id)
            setSelBucket(null)
          }}
          tipoWord={tipoWord}
        />
      </div>

      {/* Matriz + Drilldown */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <MatrizCobertura
          data={matriz}
          tipoNames={cobertura.map(c => c.nombre)}
          selBucket={selBucket}
          selTipoId={selTipoId}
          tipoWord={tipoWord}
        />
        <DrilldownPanel
          data={drillData}
          isLoading={drillLoading}
          selTipoNombre={selTipoId !== null ? cobertura.find(c => c.tipoId === selTipoId)?.nombre : undefined}
          selBucket={selBucket}
          totalTipos={totalTipos}
          tipoWord={tipoWord}
          onClear={() => { setSelTipoId(null); setSelBucket(null) }}
        />
      </div>
    </div>
  )
}
