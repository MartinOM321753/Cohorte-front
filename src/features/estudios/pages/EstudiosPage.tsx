import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function EstudiosPage() {
  return (
    <div className="page-wrapper space-y-6">
      <div className="section-header">
        <h1 className="section-title">Estudios Médicos</h1>
        <p className="section-subtitle">
          Registra y gestiona estudios médicos especializados (ECG, Espirometría, etc.)
        </p>
      </div>

      <RoleGuard allowedRoles={['MEDICO', 'ADMINISTRADOR']}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            El módulo de estudios médicos está completamente funcional pero requiere
            un backend activo. El sistema incluye un Form Engine dinámico que genera
            formularios automáticamente basándose en los parámetros definidos para cada
            tipo de estudio.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Características Implementadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>✓ API completamente tipada para todos los endpoints de estudios</li>
              <li>✓ Gestión de tipos de estudios dinámicos</li>
              <li>✓ Sistema de parámetros variables por tipo de estudio</li>
              <li>✓ Form Engine que genera formularios automáticamente</li>
              <li>✓ Soporte para múltiples tipos de datos (numérico, texto, booleano, grupos)</li>
              <li>✓ Adjuntos de archivos médicos (PDF, imágenes, videos)</li>
              <li>✓ Validación completa con Zod</li>
              <li>✓ Integración con React Query para caché y sincronización</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cómo Usar</CardTitle>
            <CardDescription>
              Guía de implementación del módulo de estudios médicos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">1. Crear Tipo de Estudio</h4>
              <code className="block bg-slate-50 p-2 rounded text-xs mb-2">
                useCreateTipoEstudio().mutate(&#123; nombre: 'ECG', descripcion: '...' &#125;)
              </code>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">2. Crear Parámetros</h4>
              <code className="block bg-slate-50 p-2 rounded text-xs mb-2">
                useCreateParametroEstudio().mutate(&#123;<br />
                &nbsp;&nbsp;idTipoEstudio: 1, nombre: 'Frecuencia Cardíaca',<br />
                &nbsp;&nbsp;unidad: 'bpm', tipo: 'NUMERICO'<br />
                &#125;)
              </code>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">3. Usar Form Engine</h4>
              <code className="block bg-slate-50 p-2 rounded text-xs">
                &lt;FormEngine parametros=&#123;parametros&#125; onSubmit=&#123;...&#125; /&gt;
              </code>
            </div>
          </CardContent>
        </Card>
      </RoleGuard>
    </div>
  )
}
