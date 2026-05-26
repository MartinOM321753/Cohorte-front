import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Mail, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import { forgotPassword } from '../api/auth.api'
import { Spinner } from '@/components/ui/spinner'

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo es obligatorio')
    .email('Ingresa un correo electrónico válido'),
})
type FormData = z.infer<typeof schema>

// ── Rate limit client-side: 1 solicitud por hora POR EMAIL ───────────────────

function lsKey(email: string) {
  return `cohorte_fpp_${email.trim().toLowerCase()}`
}

function getRateLimitSecondsLeft(email: string): number {
  const stored = localStorage.getItem(lsKey(email))
  if (!stored) return 0
  const elapsed = (Date.now() - parseInt(stored, 10)) / 1000
  const remaining = 3600 - elapsed // 1 hora = 3600 s
  return remaining > 0 ? Math.ceil(remaining) : 0
}

function setRateLimitNow(email: string) {
  localStorage.setItem(lsKey(email), String(Date.now()))
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rateLimitMsg, setRateLimitMsg] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    // Verificar rate-limit client-side (por email — cada cuenta tiene su contador)
    const secsLeft = getRateLimitSecondsLeft(data.email)
    if (secsLeft > 0) {
      const mins = Math.ceil(secsLeft / 60)
      setRateLimitMsg(
        `Ya enviamos un correo de recuperación a esta cuenta. Puedes solicitar otro en ${mins} minuto${mins !== 1 ? 's' : ''}.`,
      )
      return
    }

    setIsLoading(true)
    setRateLimitMsg('')
    try {
      await forgotPassword(data.email)
      setRateLimitNow(data.email)
      setSentEmail(data.email)
      setSent(true)
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || err?.message || ''
      // Si el backend responde 429 (rate-limit server-side)
      if (err?.response?.status === 429 || msg.toLowerCase().includes('hora')) {
        setRateLimitNow(data.email)
        setRateLimitMsg(msg || 'Ya enviamos un correo en la última hora. Revisa tu bandeja.')
      } else {
        setError('email', { message: msg || 'Error al enviar. Intenta de nuevo.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Vista "correo enviado" ────────────────────────────────────────────────────

  if (sent) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={iconCircleStyle('#dcfce7', '#16a34a')}>
              <CheckCircle2 size={28} strokeWidth={1.75} color="#16a34a" />
            </div>
          </div>
          <h2 style={titleStyle}>Revisa tu correo</h2>
          <p style={subtitleStyle}>
            Si <strong>{sentEmail}</strong> está vinculado a una cuenta, recibirás un enlace
            para restablecer tu contraseña en los próximos minutos.
          </p>
          <div style={infoBoxStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#713f12', lineHeight: 1.6 }}>
              ⏱ El enlace expira en <strong>15 minutos</strong>. Si no lo encuentras, revisa
              también la carpeta de spam.
            </p>
          </div>
          <button style={btnSecondaryStyle} onClick={() => navigate('/login')}>
            <ArrowLeft size={15} strokeWidth={1.75} />
            Volver al inicio de sesión
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Vista "formulario" ───────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={iconCircleStyle('#f0fdf4', '#1e4e3a')}>
            <Mail size={26} strokeWidth={1.75} color="#1e4e3a" />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#7d8782' }}>
            Sistema Cohorte · IMSS
          </p>
        </div>

        <h2 style={titleStyle}>¿Olvidaste tu contraseña?</h2>
        <p style={subtitleStyle}>
          Ingresa el correo electrónico vinculado a tu cuenta institucional y te enviaremos
          un enlace para restablecerla.
        </p>

        {/* Alerta rate-limit */}
        {rateLimitMsg && (
          <div style={alertStyle}>
            <AlertCircle size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span>{rateLimitMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Correo electrónico</label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 48,
                padding: '0 14px',
                background: '#ffffff',
                border: '1px solid',
                borderColor: errors.email ? '#b3261e' : '#dbe1de',
                borderRadius: 6,
              }}
            >
              <Mail size={16} strokeWidth={1.5} color="#7d8782" />
              <input
                type="email"
                placeholder="tu.correo@imss.gob.mx"
                autoComplete="email"
                autoFocus
                {...register('email')}
                style={inputStyle}
              />
            </div>
            {errors.email && (
              <div style={fieldErrorStyle}>
                <AlertCircle size={12} strokeWidth={1.75} />
                {errors.email.message}
              </div>
            )}
          </div>

          <button type="submit" disabled={isLoading} style={btnPrimaryStyle(isLoading)}>
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                Enviando enlace…
              </>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </button>
        </form>

        <button style={btnSecondaryStyle} onClick={() => navigate('/login')}>
          <ArrowLeft size={15} strokeWidth={1.75} />
          Volver al inicio de sesión
        </button>
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

const fieldErrorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 6,
  fontSize: 12,
  color: '#b3261e',
}

const alertStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '12px 14px',
  background: '#fefce8',
  border: '1px solid #fde68a',
  borderRadius: 6,
  marginBottom: 20,
  fontSize: 13,
  color: '#713f12',
  lineHeight: 1.5,
}

const infoBoxStyle: React.CSSProperties = {
  padding: '14px 16px',
  background: '#fef9ee',
  borderLeft: '4px solid #d4a866',
  borderRadius: 4,
  marginBottom: 24,
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
  marginBottom: 12,
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
  marginTop: 4,
}

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
