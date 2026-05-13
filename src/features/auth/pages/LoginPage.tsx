import { useState, useEffect } from 'react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '../schemas/login.schema'
import { loginUser } from '../api/auth.api'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'

// =========================================================================
// IMSS Cohorte — Login (Direction A · Split institucional)
// No animations, no blur. Color shifts on hover only.
// Fonts required: Inter (UI) + Fraunces (editorial display).
// Add to client/index.html <head>:
//   <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap" rel="stylesheet">
// =========================================================================

// IMSS shield placeholder — replace with the official mark when available.
function ImssShield({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 48 52" aria-hidden="true">
      <path d="M24 1 L46 7 V26 C46 38 36 47 24 51 C12 47 2 38 2 26 V7 Z" fill="#ffffff" />
      <path d="M24 6 L41 11 V26 C41 36 33 43 24 46 C15 43 7 36 7 26 V11 Z" fill="#a87b2c" />
      <path
        d="M24 14 L18 22 L13 20 L20 26 L13 30 L20 30 L17 38 L24 32 L31 38 L28 30 L35 30 L28 26 L35 20 L30 22 Z"
        fill="#1e4e3a"
      />
      <rect x="7" y="40" width="34" height="2.4" fill="#ffffff" />
    </svg>
  )
}

// Decorative oversized shield filigree used on the left panel.
function ShieldFiligree() {
  return (
    <svg
      viewBox="0 0 400 460"
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: -90,
        top: 60,
        width: 560,
        height: 640,
        opacity: 0.07,
        pointerEvents: 'none',
      }}
    >
      <path
        d="M200 0 L400 50 V230 C400 340 320 420 200 460 C80 420 0 340 0 230 V50 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <path
        d="M200 30 L370 70 V230 C370 320 300 390 200 425 C100 390 30 320 30 230 V70 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <path
        d="M200 100 L160 160 L120 145 L165 195 L120 235 L165 235 L150 295 L200 250 L250 295 L235 235 L280 235 L235 195 L280 145 L240 160 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitBtnHover, setSubmitBtnHover] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { username: '', password: '' },
  })

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const response = await loginUser(data)
      if (!response.token || !response.user) throw new Error('Respuesta de servidor inválida')
      login({ token: response.token, user: response.user })
      toast.success('Inicio de sesión exitoso')
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Error al iniciar sesión'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        background: '#ffffff',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#0d1411',
      }}
    >
      {/* ============== LEFT — INSTITUTIONAL PANEL ============== */}
      <aside
        style={{
          background: '#1e4e3a',
          color: '#ffffff',
          padding: '56px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <ShieldFiligree />

        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <ImssShield size={42} />
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#d4a866',
              }}
            >
              Instituto Mexicano del Seguro Social
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
              Cohorte · Investigación clínica
            </div>
          </div>
        </div>

        {/* Editorial display */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 10px',
              border: '1px solid rgba(212,168,102,0.4)',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#d4a866',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: '#d4a866',
              }}
            />
            Acceso · Sistema institucional
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 'clamp(40px, 5vw, 64px)',
              fontWeight: 500,
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              margin: 0,
              color: '#ffffff',
            }}
          >
            Gestión de cohortes para{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#d4a866' }}>
              investigación clínica
            </span>
            .
          </h1>
          <p
            style={{
              margin: '24px 0 0',
              fontSize: 16,
              lineHeight: 1.55,
              maxWidth: 480,
              color: 'rgba(255,255,255,0.78)',
            }}
          >
            Pacientes, estudios médicos, biobanco criogénico y prueba escalón en una sola plataforma
            institucional.
          </p>
        </div>

        {/* Footer credentials grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.14)',
            position: 'relative',
          }}
        >
          {[
            ['11', 'Unidades médicas conectadas'],
            ['5,412', 'Pacientes en cohorte activa'],
            ['v1.0', 'Versión del sistema · 2026'],
          ].map(([n, label]) => (
            <div key={label}>
              <div
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 32,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {n}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.55)',
                  marginTop: 4,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ============== RIGHT — FORM ============== */}
      <section
        style={{
          padding: '56px 80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Tiny meta strip top-right */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 12,
            color: '#7d8782',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          <span>imss.gob.mx</span>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 9999,
              background: '#dbe1de',
            }}
          />
          <span>Conexión segura · TLS 1.3</span>
        </div>

        <div style={{ maxWidth: 420, width: '100%' }}>
          {/* Numbered section eyebrow */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 24 }}>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#7d8782',
                }}
              >
                Identifíquese
              </div>
              <div style={{ fontSize: 13, color: '#4a5651', marginTop: 2 }}>
                Use sus credenciales institucionales.
              </div>
            </div>
          </div>

          <h2
            style={{
              margin: '0 0 32px',
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: '#0d1411',
            }}
          >
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Username */}
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <LoginField
                    id="username"
                    label="Usuario"
                    placeholder="nombre.apellido"
                    icon={<User size={16} strokeWidth={1.5} />}
                    disabled={isLoading}
                    error={errors.username?.message}
                    {...field}
                  />
                )}
              />

              {/* Password */}
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <LoginField
                    id="password"
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    icon={<Lock size={16} strokeWidth={1.5} />}
                    disabled={isLoading}
                    error={errors.password?.message}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        style={{
                          border: 0,
                          background: 'transparent',
                          color: '#7d8782',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {showPassword ? (
                          <EyeOff size={16} strokeWidth={1.5} />
                        ) : (
                          <Eye size={16} strokeWidth={1.5} />
                        )}
                      </button>
                    }
                    {...field}
                  />
                )}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '20px 0 28px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: '#4a5651',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: '#1e4e3a',
                    cursor: 'pointer',
                  }}
                />
                Mantener sesión iniciada
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  fontSize: 13,
                  color: '#1e4e3a',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  textDecorationThickness: 1,
                }}
              >
                ¿Olvidó su contraseña?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              onMouseEnter={() => setSubmitBtnHover(true)}
              onMouseLeave={() => setSubmitBtnHover(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                width: '100%',
                height: 52,
                padding: '0 20px',
                background: isLoading
                  ? '#143a2c'
                  : submitBtnHover
                    ? '#1a4332'
                    : '#1e4e3a',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                border: 0,
                borderRadius: 6,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: isLoading ? 0.85 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Acceder al sistema</span>
                  <ArrowRight size={18} strokeWidth={1.75} />
                </>
              )}
            </button>
          </form>

          {/* Bitácora footer */}
          <div
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: '1px solid #dbe1de',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 11,
              color: '#7d8782',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: '0.04em',
            }}
          >
            <ShieldCheck size={14} strokeWidth={1.5} style={{ color: '#1e4e3a' }} />
            ACCESO RESTRINGIDO · Todas las acciones se registran en bitácora institucional.
          </div>
        </div>
      </section>
    </div>
  )
}

// =========================================================================
// LoginField — drop-in styled field that handles its own focus state without
// transitions. Forwards refs so react-hook-form's Controller works correctly.
// =========================================================================
interface LoginFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: React.ReactNode
  trailing?: React.ReactNode
  error?: string
}

const LoginField = React.forwardRef<HTMLInputElement, LoginFieldProps>(function LoginField(
  { label, icon, trailing, error, id, ...inputProps },
  ref,
) {
  const [focus, setFocus] = useState(false)

  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#4a5651',
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 48,
          padding: '0 14px',
          background: '#ffffff',
          border: '1px solid',
          borderColor: error ? '#b3261e' : focus ? '#1e4e3a' : '#dbe1de',
          borderRadius: 6,
          boxShadow: focus ? '0 0 0 3px rgba(30,78,58,0.10)' : 'none',
        }}
      >
        {icon && <span style={{ color: '#7d8782', display: 'flex' }}>{icon}</span>}
        <input
          id={id}
          ref={ref}
          {...inputProps}
          onFocus={(e) => {
            setFocus(true)
            inputProps.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocus(false)
            inputProps.onBlur?.(e)
          }}
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: 'transparent',
            font: 'inherit',
            fontSize: 15,
            fontFamily: 'inherit',
            color: '#0d1411',
            letterSpacing: inputProps.type === 'password' ? '0.15em' : 'normal',
            minWidth: 0,
          }}
        />
        {trailing}
      </div>
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            fontSize: 12,
            color: '#b3261e',
          }}
        >
          <AlertCircle size={12} strokeWidth={1.75} />
          {error}
        </div>
      )}
    </div>
  )
})
