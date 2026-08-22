import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExamenesTab } from '@/features/estudios/components/ExamenesTab'
import { ResultadosExamenTab } from '@/features/estudios/components/ResultadosExamenTab'
import { useAuthStore } from '@/stores/authStore'

export default function ExamenesPage() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeLlenado = hasPermiso('EXAMENES_LLENADO_ACCEDER')
  const puedeCatalogo = hasPermiso('EXAMENES_CATALOGO_ACCEDER')

  const tabs = useMemo(() => {
    const t: Array<{ value: string; label: string }> = []
    if (puedeLlenado) t.push({ value: 'resultados', label: 'Resultados' })
    if (puedeCatalogo) t.push({ value: 'examenes', label: 'Catálogo de exámenes' })
    return t
  }, [puedeLlenado, puedeCatalogo])

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.value ?? 'resultados')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exámenes de laboratorio"
        subtitle="Catálogo de exámenes y registro de resultados por participante."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* El reparto de columnas va en style porque Tailwind solo genera las
            clases que encuentra escritas literalmente: `grid-cols-${n}` se arma
            al vuelo, nunca llega al CSS y la barra acaba en una sola columna. */}
        {tabs.length > 1 && (
          <TabsList
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        )}

        {puedeLlenado && (
          <TabsContent value="resultados" className="space-y-4">
            <ResultadosExamenTab />
          </TabsContent>
        )}

        {puedeCatalogo && (
          <TabsContent value="examenes" className="space-y-4">
            <ExamenesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
