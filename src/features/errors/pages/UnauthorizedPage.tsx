import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Acceso Denegado</h1>
        <p className="text-slate-600 mb-6">
          No tienes permisos para acceder a esta sección del sistema.
          Por favor, contacta al administrador si crees que esto es un error.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Volver al Dashboard
          </Button>
          <Button onClick={() => navigate('/login')}>
            Cambiar Sesión
          </Button>
        </div>
      </div>
    </div>
  )
}
