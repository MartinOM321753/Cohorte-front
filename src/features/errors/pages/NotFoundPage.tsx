import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl font-bold text-slate-900 mb-2">404</div>
        <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Página No Encontrada</h1>
        <p className="text-slate-600 mb-6">
          La página que estás buscando no existe o ha sido movida.
        </p>
        <Button onClick={() => navigate('/dashboard')}>
          Volver al Dashboard
        </Button>
      </div>
    </div>
  )
}
