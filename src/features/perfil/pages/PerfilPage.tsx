import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, KeyRound, User } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/authStore'
import { changePasswordVoluntario } from '@/features/auth/api/auth.api'

// ── Schema ──────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    passwordActual: z.string().min(1, 'Ingresa tu contraseña actual'),
    nuevaPassword: z.string().min(6, 'Mínimo 6 caracteres').max(100),
    confirmarPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((d) => d.nuevaPassword === d.confirmarPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarPassword'],
  })

type FormData = z.infer<typeof schema>

// ── Componente ──────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [showActual, setShowActual]       = useState(false)
  const [showNueva, setShowNueva]         = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [serverError, setServerError]     = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await changePasswordVoluntario(data.passwordActual, data.nuevaPassword)
      toast.success('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
      // El JWT actual ya no es válido con la nueva contraseña → cerrar sesión
      logout()
      navigate('/login', { replace: true })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'No se pudo actualizar la contraseña'
      setServerError(msg)
    }
  }

  const rolLabel = typeof user?.rol === 'string' ? user.rol : ''

  return (
    <div className="page-wrapper space-y-6 max-w-2xl">
      <div className="section-header">
        <h1 className="section-title">Mi perfil</h1>
        <p className="section-subtitle">Información de tu cuenta y configuración de acceso</p>
      </div>

      {/* ── Información del usuario ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Datos de la cuenta</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <p className="text-muted-foreground mb-0.5">Nombre completo</p>
              <p className="font-medium">{user?.nombreCompleto || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Usuario</p>
              <p className="font-mono font-medium">{user?.username || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Rol</p>
              <Badge variant="outline" className="text-[11px] font-medium">
                {rolLabel || '—'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Cambiar contraseña ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-[15px]">Cambiar contraseña</CardTitle>
              <CardDescription className="text-[12px] mt-0.5">
                Elige una contraseña segura que no hayas usado antes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {serverError && (
            <div className="mb-4 rounded-md border border-[var(--status-danger-bg)] bg-[var(--status-danger-bg)] px-4 py-3 text-[13px] text-[var(--status-danger-fg)]">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
            {/* Contraseña actual */}
            <div className="space-y-1.5">
              <Label htmlFor="passwordActual" className="text-[13px]">
                Contraseña actual <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="passwordActual"
                  type={showActual ? 'text' : 'password'}
                  {...register('passwordActual')}
                  className="h-9 pr-10 text-[13px]"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowActual((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.passwordActual && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.passwordActual.message}
                </p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="nuevaPassword" className="text-[13px]">
                Nueva contraseña <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="nuevaPassword"
                  type={showNueva ? 'text' : 'password'}
                  {...register('nuevaPassword')}
                  placeholder="Mínimo 6 caracteres"
                  className="h-9 pr-10 text-[13px]"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNueva((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.nuevaPassword && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.nuevaPassword.message}
                </p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmarPassword" className="text-[13px]">
                Confirmar contraseña <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmarPassword"
                  type={showConfirmar ? 'text' : 'password'}
                  {...register('confirmarPassword')}
                  placeholder="Repite la nueva contraseña"
                  className="h-9 pr-10 text-[13px]"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmar((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmarPassword && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.confirmarPassword.message}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[var(--imss-green-500)] hover:bg-[var(--imss-green-700)] text-white text-[13px]"
              >
                {isSubmitting ? 'Actualizando…' : 'Actualizar contraseña'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { reset(); setServerError('') }}
                disabled={isSubmitting}
                className="text-[13px]"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
