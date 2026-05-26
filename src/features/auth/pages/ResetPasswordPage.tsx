import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { validateResetToken, resetPassword } from '../api/auth.api'
import { Spinner } from '@/components/ui/spinner'

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    nuevaPassword: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .max(100, 'Máximo 100 caracteres'),
    confirmarPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.nuevaPassword === d.confirmarPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarPassword'],
  })
type FormData = z.infer<typeof schema>

// ── Estados del token ──────────────────────────────────────────────────────────

type TokenState = 'validating' | 'valid' | 'invalid' | 'expired'

// ── Componente ─────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [tokenState, setTokenState] = useState<TokenState>('validating')
  const [tokenError, setTokenError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Validar token al montar
  useEffect(() => {
    if (!token) {
      setTokenState('invalid')
      setTokenError('El enlace no contiene un token válido.')
      return
    }
    validateResetToken(token)
      .then(() => setTokenState('valid'))
      .catch((err: any) => {
        const msg: string = err?.response?.data?.message || ''
        setTokenError(msg || 'El enlace ha expirado o ya fue utilizado.')
        setTokenState(msg.toLowerCase().includes('expir') ? 'expired' : 'invalid')
      })
  }, [token])

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      await resetPassword(token, data.nuevaPassword)
      setSuccess(true)
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || err?.message || 'Error al actualizar la contraseña.'
      if (msg.toLowerCase().includes('expir') || msg.toLowerCase().includes('válid')) {
        setTokenState('expired')
        setTokenError(msg)
      } else {
        setError('nuevaPassword', { message: msg })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Pantalla: éxito ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={iconCircleStyle('#dcfce7', '#16a34a')}>
              <CheckCircle2 size={28} strokeWidth={1.75} color="#16a34a" />
            </div>
          </div>
          <h2 style={titleStyle}>¡Contraseña actualizada!</h2>
          <p style={subtitleStyle}>
            Tu contraseña fue cambiada exitosamente. Ya puedes iniciar sesión con tus
            nuevas credenciales.
          </p>
          <button style={btnPrimaryStyle(false)} onClick={() => navigate('/login')}>
            Ir al inicio de sesión
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Pantalla: token inválido / expirado ──────────────────────────────────────

  if (tokenState === 'invalid' || tokenState === 'expired') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={iconCircleStyle('#fee2e2', '#dc2626')}>
              <XCircle size={28} strokeWidth={1.75} color="#dc2626" />
            </div>
          </div>
          <h2 style={titleStyle}>Enlace inválido</h2>
          <p style={subtitleStyle}>{tokenError}</p>
          <button style={btnPrimaryStyle(false)} onClick={() => navigate('/forgot-password')}>
            Solicitar nuevo enlace
          </button>
          <button style={btnSecondaryStyle} onClick={() => navigate('/login')}>
            Volver al inicio de sesión
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Pantalla: validando token ────────────────────────────────────────────────

  if (tokenState === 'validating') {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 32px' }}>
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p style={{ fontSize: 14, color: '#6b7280' }}>Verificando enlace…</p>
        </div>
      </div>
    )
  }

  // ── Pantalla: formulario nueva contraseña ────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={iconCircleStyle('#f0fdf4', '#1e4e3a')}>
            <Lock size={26} strokeWidth={1.75} color="#1e4e3a" />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#7d8782' }}>
            Sistema Cohorte · IMSS
          </p>
        </div>

        <h2 style={titleStyle}>Nueva contraseña</h2>
        <p style={subtitleStyle}>Elige una contraseña segura para tu cuenta institucional.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Nueva contraseña */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nueva contraseña</label>
            <div style={fieldWrapStyle(!!errors.nuevaPassword)}>
              <Lock size={16} strokeWidth={1.5} color="#7d8782" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                autoFocus
                {...register('nuevaPassword')}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={iconBtnStyle}
                aria-label={showPass ? 'Ocultar' : 'Mostrar'}
              >
                {showPass ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
            {errors.nuevaPassword && (
              <div style={fieldErrorStyle}>
                <AlertCircle size={12} strokeWidth={1.75} />
                {errors.nuevaPassword.message}
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirmar contraseña</label>
            <div style={fieldWrapStyle(!!errors.confirmarPassword)}>
              <Lock size={16} strokeWidth={1.5} color="#7d8782" />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                {...register('confirmarPassword')}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                style={iconBtnStyle}
                aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
              >
                {showConfirm ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
            {errors.confirmarPassword && (
              <div style={fieldErrorStyle}>
                <AlertCircle size={12} strokeWidth={1.75} />
                {errors.confirmarPassword.message}
              </div>
            )}
          </div>

          <button type="submit" disabled={isLoading} style={btnPrimaryStyle(isLoading)}>
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                Actualizando…
              </>
            ) : (
              'Establecer nueva contraseña'
            )}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <div
      style={{
        marginTop: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 11,
        color: '#9ca3af',
        letterSpacing: '0.04em',
      }}
    >
      <ShieldCheck size={13} strokeWidth={1.5} color="#1e4e3a" />
      ACCESO RESTRINGIDO · Todas las acciones se registran en bitácora institucional
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f6f8',
  padding: '24px 16px',
  fontFamily: "'Inter', system-ui, sans-serif",
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  background: '#ffffff',
  borderRadius: 10,
  padding: '36px 32px',
  boxShadow: '0 2px 12px rgba(0,0,0,.08)',
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 26,
  fontWeight: 600,
  color: '#0d1411',
  letterSpacing: '-0.02em',
  textAlign: 'center',
}

const subtitleStyle: React.CSSProperties = {
  margin: '0 0 24px',
  fontSize: 14,
  color: '#6b7280',
  lineHeight: 1.6,
  textAlign: 'center',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#4a5651',
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  border: 0,
  outline: 0,
  background: 'transparent',
  fontSize: 15,
  color: '#0d1411',
  fontFamily: 'inherit',
  minWidth: 0,
}

const iconBtnStyle: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  color: '#7d8782',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
}

const fieldErrorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 6,
  fontSize: 12,
  color: '#b3261e',
}

const btnPrimaryStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  width: '100%',
  height: 48,
  padding: '0 20px',
  background: disabled ? '#143a2c' : '#1e4e3a',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.005em',
  border: 0,
  borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit',
  opacity: disabled ? 0.85 : 1,
  marginBottom: 10,
})

const btnSecondaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  height: 40,
  padding: '0 16px',
  background: 'transparent',
  color: '#4a5651',
  fontSize: 14,
  fontWeight: 500,
  border: '1px solid #dbe1de',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const fieldWrapStyle = (error: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  height: 48,
  padding: '0 14px',
  background: '#ffffff',
  border: '1px solid',
  borderColor: error ? '#b3261e' : '#dbe1de',
  borderRadius: 6,
})

function iconCircleStyle(bg: string, border: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: bg,
    border: `1px solid ${border}22`,
    marginBottom: 12,
  }
}
