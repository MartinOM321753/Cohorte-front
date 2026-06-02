import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-[480px] text-center">
        <div
          style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic' }}
          className="text-[88px] leading-none text-[var(--imss-ochre-500)]"
        >
          403
        </div>
        <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.01em] text-foreground">Acceso no autorizado</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          No cuenta con permisos para acceder a esta sección. Si considera que se trata de un error, contacte al
          administrador del sistema.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Volver al dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate('/login')}>
            Cambiar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

