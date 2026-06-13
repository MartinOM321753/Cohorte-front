import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'
import { RefrigeradoresTab } from '../components/RefrigeradoresTab'
import { CajasTab } from '../components/CajasTab'
import { MuestrasTab } from '../components/MuestrasTab'
import { PrestamosTab } from '../components/PrestamosTab'
import { TipoMuestraAdminTab } from '../components/TipoMuestraAdminTab'
import { TipoEstudioMuestraAdminTab } from '../components/TipoEstudioMuestraAdminTab'

export default function BiobancoPage() {
  const [activeTab, setActiveTab] = useState('refrigeradores')

  return (
    <RoleGuard allowedRoles={['LABORATORISTA', 'ADMINISTRADOR']}>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="refrigeradores">Refrigeradores</TabsTrigger>
            <TabsTrigger value="cajas">Cajas criogénicas</TabsTrigger>
            <TabsTrigger value="muestras">Muestras</TabsTrigger>
            <TabsTrigger value="tipos-muestra">Tipos de Muestra</TabsTrigger>
            <TabsTrigger value="est-muestras">Est. Muestras</TabsTrigger>
            <TabsTrigger value="prestamos">Préstamos</TabsTrigger>
          </TabsList>

          <TabsContent value="refrigeradores" className="space-y-4">
            <RefrigeradoresTab />
          </TabsContent>

          <TabsContent value="cajas" className="space-y-4">
            <CajasTab />
          </TabsContent>

          <TabsContent value="muestras" className="space-y-4">
            <MuestrasTab />
          </TabsContent>

          <TabsContent value="tipos-muestra" className="space-y-4">
            <TipoMuestraAdminTab />
          </TabsContent>

          <TabsContent value="est-muestras" className="space-y-4">
            <TipoEstudioMuestraAdminTab />
          </TabsContent>

          <TabsContent value="prestamos" className="space-y-4">
            <PrestamosTab />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}
