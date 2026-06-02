import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { changePasswordForced } from '../api/auth.api'

const schema = z
  .object({
    nuevaPassword: z
      .string()
      .min(6, 'Mínimo 6 caracteres')
      .max(100, 'Máximo 100 caracteres'),
    confirmarPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.nuevaPassword === d.confirmarPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarPassword'],
  })

type FormData = z.infer<typeof schema>

export default function CambiarContrasenaPage() {
  const navigate = useNavigate()
  const { user, clearMustChangePassword } = useAuthStore()

  const [showNueva, setShowNueva] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await changePasswordForced(data.nuevaPassword)
      clearMustChangePassword()
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message ?? 'No se pudo actualizar la contraseña. Intenta de nuevo.'
      )
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-card rounded-xl shadow-md overflow-hidden">

          {/* Cabecera */}
          <div className="bg-[#1e4e3a] px-8 py-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15 mb-3">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-[18px] font-semibold text-white leading-snug">
              Cambio de contraseña obligatorio
            </h1>
            <p className="text-[13px] text-white/70 mt-1">
              Por seguridad debes crear una nueva contraseña antes de continuar
            </p>
          </div>

          {/* Banda dorada */}
          <div className="h-[3px] bg-[#d4a866]" />

          {/* Formulario */}
          <div className="px-8 py-6 space-y-5">

            {/* Saludo */}
            {user && (
              <p className="text-[13px] text-[var(--imss-ink-500)]">
                Hola, <strong className="text-[var(--imss-ink-900)]">{user.nombreCompleto || user.username}</strong>.
                Tu cuenta fue creada por un administrador con una contraseña temporal.
                Elige una nueva contraseña segura para continuar.
              </p>
            )}

            {/* Error de servidor */}
            {serverError && (
              <div className="rounded-md border border-[var(--status-danger-bg)] bg-[var(--status-danger-bg)] px-4 py-3 text-[13px] text-[var(--status-danger-fg)]">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nueva contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="nuevaPassword" className="text-[13px]">
                  Nueva contraseña <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nuevaPassword"
                    type={showNueva ? 'text' : 'password'}
                    {...register('nuevaPassword')}
                    placeholder="Mínimo 6 caracteres"
                    className="h-10 pl-9 pr-10 text-[13px]"
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
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmarPassword"
                    type={showConfirmar ? 'text' : 'password'}
                    {...register('confirmarPassword')}
                    placeholder="Repite la nueva contraseña"
                    className="h-10 pl-9 pr-10 text-[13px]"
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-[#1e4e3a] hover:bg-[#163b2c] text-white text-[13px] font-semibold"
              >
                {isSubmitting ? 'Actualizando…' : 'Establecer nueva contraseña'}
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          IMSS · Sistema de Cohorte · Acceso restringido
        </p>
      </div>
    </div>
  )
}
