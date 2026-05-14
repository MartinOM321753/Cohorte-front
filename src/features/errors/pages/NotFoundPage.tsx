import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-[480px] text-center">
        <div
          style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic' }}
          className="text-[88px] leading-none text-[var(--imss-ochre-500)]"
        >
          404
        </div>
        <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.01em] text-foreground">Recurso no encontrado</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          La ruta solicitada no existe o no está disponible.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate('/dashboard')}>Volver al dashboard</Button>
        </div>
      </div>
    </div>
  )
}

