import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/PageHeader'
import { Network } from 'lucide-react'
import { InstitucionesTab } from '../components/InstitucionesTab'

export default function InstitucionesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Instituciones"
        subtitle="Catálogo central de instituciones · jerarquía · ubicación · módulos habilitados."
      />

      <Alert>
        <Network className="h-4 w-4" strokeWidth={1.75} />
        <AlertDescription>
          Administra las instituciones que participan en el sistema. Cada institución puede depender
          de otra (jerarquía), define su ubicación geográfica y determina qué módulos y datos
          pueden ver sus usuarios — garantizando el aislamiento de información entre instituciones.
        </AlertDescription>
      </Alert>

      <InstitucionesTab />
    </div>
  )
}
