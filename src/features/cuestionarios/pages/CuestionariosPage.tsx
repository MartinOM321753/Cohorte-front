import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import {
  BarraPestanas, PISTA_PESTANAS, Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/authStore'
import { CargaCatalogoTab } from '../components/CargaCatalogoTab'
import { CargaVolcadoTab } from '../components/CargaVolcadoTab'
import { CatalogoCuestionariosTab } from '../components/CatalogoCuestionariosTab'
import { LlenadoCuestionarioTab } from '../components/LlenadoCuestionarioTab'
import { PendientesTab } from '../components/PendientesTab'

/**
 * El módulo de cuestionarios.
 *
 * Mismo reparto por pestañas que estudios médicos, con una de más: la de recaptura. No es
 * una pestaña de adorno — el reconocimiento de escritura llegó sin licencia en los volcados
 * recibidos, y eso dejó sin leer casi nueve de cada diez campos de texto del instrumento.
 */
export default function CuestionariosPage() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeLlenado = hasPermiso('CUESTIONARIOS_LLENADO_ACCEDER')
  const puedeCatalogo = hasPermiso('CUESTIONARIOS_CATALOGO_ACCEDER')
  const puedeVolcado = hasPermiso('CUESTIONARIOS_CARGA_MASIVA')
  const puedeCargarCatalogo = hasPermiso('CUESTIONARIOS_CATALOGO_CARGAR')

  const pestanas = useMemo(() => {
    const t: Array<{ value: string; label: string }> = []
    if (puedeLlenado) t.push({ value: 'llenado', label: 'Llenado' })
    if (puedeLlenado) t.push({ value: 'pendientes', label: 'Recaptura' })
    if (puedeCatalogo) t.push({ value: 'catalogo', label: 'Cat. Cuestionarios' })
    if (puedeVolcado) t.push({ value: 'volcado', label: 'Carga de volcado' })
    if (puedeCargarCatalogo) t.push({ value: 'carga-catalogo', label: 'Carga de catálogo' })
    return t
  }, [puedeLlenado, puedeCatalogo, puedeVolcado, puedeCargarCatalogo])

  const [activa, setActiva] = useState<string>(pestanas[0]?.value ?? 'llenado')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cuestionarios"
        subtitle="Instrumentos de la cohorte: catálogo de preguntas, llenado por participante y carga de los volcados escaneados."
      />

      <Tabs value={activa} onValueChange={setActiva} className="w-full">
        {/* El numero de columnas va en style y no en una clase de Tailwind:
            `grid-cols-${n}` se construye al vuelo y Tailwind no puede verlo al
            escanear el codigo, asi que la clase nunca llega al CSS. */}
        {pestanas.length > 1 && (
          <BarraPestanas>
            <TabsList className={PISTA_PESTANAS}>
              {pestanas.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>
              ))}
            </TabsList>
          </BarraPestanas>
        )}

        {puedeLlenado && (
          <TabsContent value="llenado" className="space-y-4">
            <LlenadoCuestionarioTab />
          </TabsContent>
        )}

        {puedeLlenado && (
          <TabsContent value="pendientes" className="space-y-4">
            <PendientesTab />
          </TabsContent>
        )}

        {puedeCatalogo && (
          <TabsContent value="catalogo" className="space-y-4">
            <CatalogoCuestionariosTab />
          </TabsContent>
        )}

        {puedeVolcado && (
          <TabsContent value="volcado" className="space-y-4">
            <CargaVolcadoTab />
          </TabsContent>
        )}

        {puedeCargarCatalogo && (
          <TabsContent value="carga-catalogo" className="space-y-4">
            <CargaCatalogoTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
