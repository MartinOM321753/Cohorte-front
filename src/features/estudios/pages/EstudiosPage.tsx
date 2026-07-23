import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LlenadoEstudioTab } from '../components/LlenadoEstudioTab'
import { TiposEstudioTab } from '../components/TiposEstudioTab'
import { useAuthStore } from '@/stores/authStore'

export default function EstudiosPage() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeLlenado = hasPermiso('ESTUDIOS_LLENADO_ACCEDER')
  const puedeCatalogo = hasPermiso('ESTUDIOS_CATALOGO_ACCEDER')

  const tabs = useMemo(() => {
    const t: Array<{ value: string; label: string }> = []
    if (puedeLlenado) t.push({ value: 'llenado', label: 'Llenado' })
    if (puedeCatalogo) t.push({ value: 'catalogos', label: 'Cat. Estudios' })
    return t
  }, [puedeLlenado, puedeCatalogo])

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.value ?? 'llenado')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Estudios médicos"
        subtitle="Registro y gestión de estudios médicos especializados por participante."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {tabs.length > 1 && (
          <TabsList className={`grid w-full grid-cols-${tabs.length}`}>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        )}

        {puedeLlenado && (
          <TabsContent value="llenado" className="space-y-4">
            <LlenadoEstudioTab />
          </TabsContent>
        )}

        {puedeCatalogo && (
          <TabsContent value="catalogos" className="space-y-4">
            <TiposEstudioTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
