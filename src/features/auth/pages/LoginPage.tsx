import { useState, useEffect } from "react";
import * as React from "react";
import cohorteWatermark from "../../../assets/cohorte-watermark.png";
import cohorteLogo from "../../../assets/logo.png";
import logoAsociacion from "../../../assets/ASOCIACIÓN.png";
import logoGenomica from "../../../assets/GENOMICA.png";
import logoImss from "../../../assets/IMSS.png";
import logoInprfm from "../../../assets/INPRFM.png";
import logoInsp from "../../../assets/INSP.png";
import logoNutricion from "../../../assets/NUTRICIÓN.png";
import logoUnam from "../../../assets/UNAM.png";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "../schemas/login.schema";
import { loginUser, getGeolocation } from "../api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { resolveHomeRoute } from "@/config/featurePermisos";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  MapPin,
  MapPinOff,
} from "lucide-react";

type GeoStatus = "requesting" | "granted" | "denied" | "unavailable";

// =========================================================================
// IMSS Cohorte — Login (Direction A · Split institucional)
// No animations, no blur. Color shifts on hover only.
// Fonts required: Inter (UI) + Fraunces (editorial display).
// Add to client/index.html <head>:
//   <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap" rel="stylesheet">
// =========================================================================

// ── Logo institucional — Cohorte de Trabajadores de la Salud ─────────────────
function ImssShield({ size = 68 }: { size?: number }) {
  return (
    <img
      src={cohorteLogo}
      alt="Cohorte de Trabajadores de la Salud"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        filter: "invert(1)",
        mixBlendMode: "screen",
        flexShrink: 0,
      }}
    />
  );
}

// ── Logos de instituciones colaboradoras ──────────────────────────────────────
const COLLABORATORS = [
  { src: logoImss, name: "Instituto Mexicano del Seguro Social (IMSS)", url: "https://www.imss.gob.mx" },
  { src: logoUnam, name: "Universidad Nacional Autónoma de México (UNAM)", url: "https://www.unam.mx" },
  { src: logoInsp, name: "Instituto Nacional de Salud Pública (INSP)", url: "https://www.insp.mx" },
  { src: logoInprfm, name: "Instituto Nacional de Psiquiatría Ramón de la Fuente Muñiz (INPRFM)", url: "https://www.inprf.gob.mx" },
  { src: logoGenomica, name: "Instituto Nacional de Medicina Genómica (INMEGEN)", url: "https://www.inmegen.gob.mx" },
  { src: logoNutricion, name: "Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán (INCMNSZ)", url: "https://www.incmnsz.mx" },
  { src: logoAsociacion, name: "Asociación Mexicana de Diabetes en Morelos, A.C.", url: "https://amdiabetes.org" },
];

function CollaboratorLogos() {
  return (
    <div className="collab-logos">
      {COLLABORATORS.map((c, i) => (
        <a
          key={i}
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          title={c.name}
          aria-label={c.name}
          className="collab-logo-link"
        >
          <img className="collab-logo-img" src={c.src} alt={c.name} />
        </a>
      ))}
    </div>
  );
}

// ── Aviso de estado de geolocalización (no bloquea el login) ────────────────
function GeoBanner({ status }: { status: GeoStatus }) {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 6,
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 20,
  };

  if (status === "requesting") {
    return (
      <div style={{ ...base, background: "#f0fdf4", color: "#1e4e3a" }}>
        <MapPin size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Solicitando tu ubicación para registrarla en la bitácora…</span>
      </div>
    );
  }

  if (status === "granted") {
    return (
      <div style={{ ...base, background: "#f0fdf4", color: "#1e4e3a" }}>
        <MapPin size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Ubicación capturada. Ya puedes iniciar sesión.</span>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div style={{ ...base, background: "#fef2f2", color: "#991b1b" }}>
        <MapPinOff size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Permiso de ubicación no concedido. Es obligatorio para iniciar sesión: concede el
          permiso desde el ícono de candado o ubicación en la barra de direcciones y
          recarga la página.
        </span>
      </div>
    );
  }

  // unavailable
  return (
    <div style={{ ...base, background: "#fef2f2", color: "#991b1b" }}>
      <MapPinOff size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>Tu navegador no soporta geolocalización, así que no es posible iniciar sesión desde aquí.</span>
    </div>
  );
}

// ── Marca de agua circular centrada en el panel izquierdo ────────────────────
function ShieldFiligree() {
  return (
    <img
      src={cohorteWatermark}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "65%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 540,
        height: 540,
        objectFit: "contain",
        opacity: 0.18,
        mixBlendMode: "screen",
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, hasPermiso } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitBtnHover, setSubmitBtnHover] = useState(false);

  // ── Geolocalización obligatoria (HTTPS ya permite el prompt nativo) ──────
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("requesting");
  const [coords, setCoords] = useState<{
    latitud: number;
    longitud: number;
    precisionM: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGeoStatus("requesting");
    getGeolocation()
      .then((c) => {
        if (cancelled) return;
        setCoords(c);
        setGeoStatus("granted");
      })
      .catch((err) => {
        if (cancelled) return;
        // GeolocationPositionError.code 1 = PERMISSION_DENIED
        if (err?.code === 1 || err?.message === "GEOLOCATION_UNAVAILABLE") {
          setGeoStatus(
            err?.message === "GEOLOCATION_UNAVAILABLE"
              ? "unavailable"
              : "denied",
          );
        } else {
          setGeoStatus("denied");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { identifier: "", password: "" },
  });

  useEffect(() => {
    if (isAuthenticated)
      navigate(resolveHomeRoute(hasPermiso), { replace: true });
  }, [isAuthenticated, navigate, hasPermiso]);

  const onSubmit = async (data: LoginFormData) => {
    if (!coords) {
      toast.error("Necesitamos tu ubicación para continuar. Concede el permiso desde el ícono de candado/ubicación en la barra de direcciones e intenta de nuevo.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await loginUser(data, coords);
      if (!response.user) throw new Error("Respuesta de servidor inválida");
      const ok = await login({ user: response.user, mustChangePassword: response.mustChangePassword, permisos: response.permisos, roles: response.roles });
      if (!ok) throw new Error("Rol de usuario no reconocido");
      toast.success("Inicio de sesión exitoso");
      navigate(resolveHomeRoute(hasPermiso), { replace: true });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Error al iniciar sesión";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="login-grid"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#0d1411",
      }}
    >
      <style>{`
        .login-grid {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
        }
        .login-aside {
          padding: 56px 64px;
        }
        .login-section {
          padding: 56px 80px;
        }
        .collab-logos {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 14px;
          margin-top: 32px;
          border-top: 1px solid #dbe1de;
        }
        .collab-logo-link {
          display: inline-flex;
          flex-shrink: 0;
        }
        .collab-logo-img {
          height: 48px;
          width: 48px;
          object-fit: contain;
          opacity: 0.92;
          flex-shrink: 0;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .collab-logo-link:hover .collab-logo-img {
          opacity: 1;
          transform: scale(1.06);
        }
        @media (max-width: 900px) {
          .login-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }
          .login-aside {
            padding: 40px 24px;
            min-height: 320px;
          }
          .login-section {
            padding: 40px 24px;
          }
          .collab-logo-img {
            height: 34px;
            width: 34px;
          }
        }
        @media (max-width: 480px) {
          .collab-logos {
            justify-content: center;
            gap: 18px;
          }
        }
      `}</style>
      {/* ============== LEFT — INSTITUTIONAL PANEL ============== */}
      <aside
        className="login-aside"
        style={{
          background: "#1e4e3a",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ShieldFiligree />

        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            position: "relative",
          }}
        >
          <ImssShield size={92} />
          <div>
            {/* <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#d4a866",
              }}
            >
              Instituto Mexicano del Seguro Social
            </div> */}
            <div style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>
               Cohorte de Trabajadores de la salud
            </div>
          </div>
        </div>

        {/* Editorial display */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 10px",
              border: "1px solid rgba(212,168,102,0.4)",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#d4a866",
              marginBottom: 15,
              marginTop: 35,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: "#d4a866",
              }}
            />
            Acceso · Sistema institucional
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(40px, 5vw, 64px)",
              fontWeight: 500,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              margin: 0,
              color: "#ffffff",
            }}
          >
            <span
              style={{ fontStyle: "italic", fontWeight: 400, color: "#d4a866" }}
            >
              2000 - 2026
            </span>
          </h1>
        </div>

        {/* Línea divisoria, siempre al fondo del panel */}
        <hr
          style={{
            marginTop: "auto",
            marginBottom: 0,
            border: 0,
            borderTop: "1px solid rgba(255,255,255,0.2)",
          }}
        />
      </aside>

      {/* ============== RIGHT — FORM ============== */}
      <section
        className="login-section"
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          position: "relative",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
        <div style={{ maxWidth: 420, width: "100%" }}>
          {/* Numbered section eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#7d8782",
                }}
              >
                Identifíquese
              </div>
              <div style={{ fontSize: 13, color: "#4a5651", marginTop: 2 }}>
                Use sus credenciales institucionales.
              </div>
            </div>
          </div>

          <h2
            style={{
              margin: "0 0 32px",
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "#0d1411",
            }}
          >
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Identifier (username o correo) */}
              <Controller
                name="identifier"
                control={control}
                render={({ field }) => (
                  <LoginField
                    id="identifier"
                    label="Usuario o correo electrónico"
                    placeholder="usuario o correo@ejemplo.com"
                    autoComplete="username"
                    icon={<User size={16} strokeWidth={1.5} />}
                    disabled={isLoading}
                    error={errors.identifier?.message}
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
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    icon={<Lock size={16} strokeWidth={1.5} />}
                    disabled={isLoading}
                    error={errors.password?.message}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={
                          showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                        style={{
                          border: 0,
                          background: "transparent",
                          color: "#7d8782",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
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
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "20px 0 28px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "#4a5651",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: "#1e4e3a",
                    cursor: "pointer",
                  }}
                />
                Mantener sesión iniciada
              </label>
              <a
                href="/forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/forgot-password");
                }}
                style={{
                  fontSize: 13,
                  color: "#1e4e3a",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  textDecorationThickness: 1,
                }}
              >
                ¿Olvidó su contraseña?
              </a>
            </div>

            <GeoBanner status={geoStatus} />

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || geoStatus !== "granted"}
              onMouseEnter={() => setSubmitBtnHover(true)}
              onMouseLeave={() => setSubmitBtnHover(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                width: "100%",
                height: 52,
                padding: "0 20px",
                background:
                  isLoading || geoStatus !== "granted"
                    ? "#143a2c"
                    : submitBtnHover
                      ? "#1a4332"
                      : "#1e4e3a",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                border: 0,
                borderRadius: 6,
                cursor: isLoading || geoStatus !== "granted" ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: isLoading || geoStatus !== "granted" ? 0.85 : 1,
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
              borderTop: "1px solid #fff", /*dbe1de */
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11,
              color: "#fff", /*#7d8782*/
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: "0.04em",
            }}
          >
            {/* <ShieldCheck
              size={14}
              strokeWidth={1.5}
              style={{ color: "#1e4e3a" }}
            /> */}
            {/* ACCESO RESTRINGIDO · Todas las acciones se registran en bitácora
            institucional. */}
          </div>
        </div>
        </div>

        <CollaboratorLogos />
      </section>
    </div>
  );
}

// =========================================================================
// LoginField — drop-in styled field that handles its own focus state without
// transitions. Forwards refs so react-hook-form's Controller works correctly.
// =========================================================================
interface LoginFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  error?: string;
}

const LoginField = React.forwardRef<HTMLInputElement, LoginFieldProps>(
  function LoginField(
    { label, icon, trailing, error, id, ...inputProps },
    ref,
  ) {
    const [focus, setFocus] = useState(false);

    return (
      <div>
        <label
          htmlFor={id}
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#4a5651",
            marginBottom: 8,
          }}
        >
          {label}
        </label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 48,
            padding: "0 14px",
            background: "#ffffff",
            border: "1px solid",
            borderColor: error ? "#b3261e" : focus ? "#1e4e3a" : "#dbe1de",
            borderRadius: 6,
            boxShadow: focus ? "0 0 0 3px rgba(30,78,58,0.10)" : "none",
          }}
        >
          {icon && (
            <span style={{ color: "#7d8782", display: "flex" }}>{icon}</span>
          )}
          <input
            id={id}
            ref={ref}
            {...inputProps}
            onFocus={(e) => {
              setFocus(true);
              inputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocus(false);
              inputProps.onBlur?.(e);
            }}
            style={{
              flex: 1,
              border: 0,
              outline: 0,
              background: "transparent",
              font: "inherit",
              fontSize: 15,
              fontFamily: "inherit",
              color: "#0d1411",
              letterSpacing:
                inputProps.type === "password" ? "0.15em" : "normal",
              minWidth: 0,
            }}
          />
          {trailing}
        </div>
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
              fontSize: 12,
              color: "#b3261e",
            }}
          >
            <AlertCircle size={12} strokeWidth={1.75} />
            {error}
          </div>
        )}
      </div>
    );
  },
);
