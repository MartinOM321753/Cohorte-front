import { useState, useMemo } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle } from 'lucide-react'
import { RefrigeradoresTab } from '../components/RefrigeradoresTab'
import { CajasTab } from '../components/CajasTab'
import { MuestrasTab } from '../components/MuestrasTab'
import { PrestamosTab } from '../components/PrestamosTab'
import { TipoMuestraAdminTab } from '../components/TipoMuestraAdminTab'
import { TipoEstudioMuestraAdminTab } from '../components/TipoEstudioMuestraAdminTab'
import { useGetRefrigeradores, useGetTiposMuestraActivos } from '../hooks/useBiobanco'
import { useAuthStore } from '@/stores/authStore'

interface TabDef {
  value: string
  label: string
  permiso: string
  /** Permiso adicional requerido aparte del _VER (datos prerequisito) */
  dataDep?: { enabled: boolean; tooltip: string }
}

export default function BiobancoPage() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)

  const puedeRefrigeradores = hasPermiso('REFRIGERADORES_ACCEDER')
  const puedeCajas = hasPermiso('CAJAS_ACCEDER')
  const puedeMuestras = hasPermiso('MUESTRAS_VER')
  const puedeTiposMuestra = hasPermiso('TIPOS_MUESTRA_ACCEDER')
  const puedeEstMuestras = hasPermiso('ESTUDIOS_MUESTRA_ACCEDER')
  const puedePrestamos = hasPermiso('TRASLADOS_ACCEDER')

  // Solo fetch si el usuario tiene permisos que necesitan estos datos
  // (Cajas hace lookup implícito de refrigeradores; Muestras hace lookup de tipos.)
  const { data: refrigeradores = [] } = useGetRefrigeradores({
    enabled: puedeRefrigeradores || puedeCajas || hasPermiso('REFRIGERADORES_LOOKUP'),
  })
  const { data: tiposMuestraActivos = [] } = useGetTiposMuestraActivos({
    enabled: puedeMuestras || puedeTiposMuestra || hasPermiso('TIPOS_MUESTRA_LOOKUP'),
  })

  const hayPisos = refrigeradores.some((r) => r.totalPisos > 0)
  const hayTiposMuestra = tiposMuestraActivos.length > 0

  const tabs = useMemo<TabDef[]>(() => {
    const all: TabDef[] = []
    if (puedeRefrigeradores)
      all.push({ value: 'refrigeradores', label: 'Refrigeradores', permiso: 'REFRIGERADORES_ACCEDER' })
    if (puedeCajas)
      all.push({
        value: 'cajas',
        label: 'Cajas criogénicas',
        permiso: 'CAJAS_ACCEDER',
        dataDep: { enabled: hayPisos, tooltip: 'Primero crea al menos un piso en un refrigerador' },
      })
    if (puedeMuestras)
      all.push({
        value: 'muestras',
        label: 'Muestras',
        permiso: 'MUESTRAS_VER',
        dataDep: { enabled: hayTiposMuestra, tooltip: 'Primero configura al menos un tipo de muestra activo' },
      })
    if (puedeTiposMuestra)
      all.push({ value: 'tipos-muestra', label: 'Tipos de Muestra', permiso: 'TIPOS_MUESTRA_ACCEDER' })
    if (puedeEstMuestras)
      all.push({ value: 'est-muestras', label: 'Est. Muestras', permiso: 'ESTUDIOS_MUESTRA_ACCEDER' })
    if (puedePrestamos)
      all.push({ value: 'prestamos', label: 'Préstamos', permiso: 'TRASLADOS_ACCEDER' })
    return all
  }, [hasPermiso, puedeRefrigeradores, puedeCajas, puedeMuestras, puedeTiposMuestra, puedeEstMuestras, puedePrestamos, hayPisos, hayTiposMuestra])

  const defaultTab = tabs.find((t) => !t.dataDep || t.dataDep.enabled)?.value ?? tabs[0]?.value ?? 'refrigeradores'
  const [activeTab, setActiveTab] = useState(defaultTab)

  const handleTabChange = (value: string) => {
    const tab = tabs.find((t) => t.value === value)
    if (tab?.dataDep && !tab.dataDep.enabled) return
    setActiveTab(value)
  }

  const gridCols = tabs.length <= 4 ? `sm:grid-cols-${tabs.length}` : tabs.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-6'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Biobanco"
        subtitle="Refrigeradores criogénicos · pisos · cajas · posiciones · préstamos entre instituciones."
      />

      <Alert>
        <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
        <AlertDescription>
          Sistema de almacenamiento criogénico jerárquico: Refrigerador → Piso → Caja → Muestra.
          Las muestras pertenecen a la institución que las recolecta y pueden prestarse a otras instituciones con biobanco.
        </AlertDescription>
      </Alert>

      <TooltipProvider delayDuration={100}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`flex overflow-x-auto scrollbar-none gap-1 sm:grid sm:w-full ${gridCols}`}>
            {tabs.map((tab) => {
              const disabled = tab.dataDep && !tab.dataDep.enabled
              if (disabled) {
                return (
                  <Tooltip key={tab.value}>
                    <TooltipTrigger asChild>
                      <span className="shrink-0 sm:w-full sm:shrink">
                        <TabsTrigger value={tab.value} disabled className="w-full pointer-events-none opacity-50">
                          {tab.label}
                        </TabsTrigger>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{tab.dataDep!.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 sm:shrink">
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {puedeRefrigeradores && (
            <TabsContent value="refrigeradores" className="space-y-4">
              <RefrigeradoresTab />
            </TabsContent>
          )}
          {puedeCajas && (
            <TabsContent value="cajas" className="space-y-4">
              <CajasTab />
            </TabsContent>
          )}
          {puedeMuestras && (
            <TabsContent value="muestras" className="space-y-4">
              <MuestrasTab />
            </TabsContent>
          )}
          {puedeTiposMuestra && (
            <TabsContent value="tipos-muestra" className="space-y-4">
              <TipoMuestraAdminTab />
            </TabsContent>
          )}
          {puedeEstMuestras && (
            <TabsContent value="est-muestras" className="space-y-4">
              <TipoEstudioMuestraAdminTab />
            </TabsContent>
          )}
          {puedePrestamos && (
            <TabsContent value="prestamos" className="space-y-4">
              <PrestamosTab />
            </TabsContent>
          )}
        </Tabs>
      </TooltipProvider>
    </div>
  )
}
