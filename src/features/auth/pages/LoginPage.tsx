import { useState, useEffect } from "react";
import * as React from "react";
import cohorteWatermark from "../../../assets/cohorte-watermark.png";
import cohorteLogo from "../../../assets/logo.png";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "../schemas/login.schema";
import { loginUser, getGeolocation } from "../api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
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
  const { login, isAuthenticated, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitBtnHover, setSubmitBtnHover] = useState(false);

  // ── Geolocalización obligatoria ──────────────────────────────────────────
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
      navigate(hasRole("ENCARGADO") ? "/mis-muestras" : "/dashboard", {
        replace: true,
      });
  }, [isAuthenticated, navigate, hasRole]);

  const onSubmit = async (data: LoginFormData) => {
    if (!coords) {
      toast.error("Se requiere permiso de ubicación para acceder al sistema.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await loginUser(data, coords);
      if (!response.token || !response.user)
        throw new Error("Respuesta de servidor inválida");
      login({ token: response.token, user: response.user });
      toast.success("Inicio de sesión exitoso");
      // Role-based redirect: ENCARGADO goes to their samples page
      const targetRole = response.user?.rol;
      const isEncargado =
        typeof targetRole === "string"
          ? targetRole === "ENCARGADO"
          : (targetRole as any)?.nombre === "ENCARGADO";
      navigate(isEncargado ? "/mis-muestras" : "/dashboard", { replace: true });
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
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        background: "#ffffff",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#0d1411",
      }}
    >
      {/* ============== LEFT — INSTITUTIONAL PANEL ============== */}
      <aside
        style={{
          background: "#1e4e3a",
          color: "#ffffff",
          padding: "56px 64px",
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
              Etapa 2026-2027
            </span>
          </h1>
        </div>

        {/* Texto institucional fijo al fondo del panel */}
        <p
          style={{
            position: "absolute",
            bottom: 56,
            left: 64,
            right: 64,
            margin: 0,
            fontSize: 18,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          Pacientes, estudios médicos y biobanco criogénico en una sola
          plataforma institucional.
        </p>
        <hr style={{
            position: "absolute",
            bottom: 56,
            left: 64,
            right: 64,
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.78)",
            
          }}></hr>

      </aside>

      {/* ============== RIGHT — FORM ============== */}
      <section
        style={{
          padding: "56px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#ffffff",
          position: "relative",
        }}
      >
        {/* Tiny meta strip top-right */}
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 12,
            color: "#7d8782",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          <span>imss.gob.mx</span>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 9999,
              background: "#dbe1de",
            }}
          />
          <span>Conexión segura · TLS 1.3</span>
        </div>

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

            {/* Banner de geolocalización */}
            <GeoBanner
              status={geoStatus}
              precisionM={coords?.precisionM ?? null}
            />

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
                  geoStatus !== "granted"
                    ? "#9ca3af"
                    : isLoading
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
                cursor:
                  isLoading || geoStatus !== "granted"
                    ? "not-allowed"
                    : "pointer",
                fontFamily: "inherit",
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
              borderTop: "1px solid #dbe1de",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11,
              color: "#7d8782",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: "0.04em",
            }}
          >
            <ShieldCheck
              size={14}
              strokeWidth={1.5}
              style={{ color: "#1e4e3a" }}
            />
            ACCESO RESTRINGIDO · Todas las acciones se registran en bitácora
            institucional.
          </div>
        </div>
      </section>
    </div>
  );
}

// =========================================================================
// GeoBanner — muestra el estado del permiso de geolocalización.
// Bloquea visualmente el acceso cuando el permiso no ha sido otorgado.
// =========================================================================
function GeoBanner({
  status,
  precisionM,
}: {
  status: GeoStatus;
  precisionM: number | null;
}) {
  if (status === "granted") {
    // Clasificar la calidad de la señal según el margen de error
    const quality =
      precisionM === null
        ? null
        : precisionM <= 10
          ? {
              label: "GPS · Alta precisión",
              color: "#166534",
              bg: "#f0fdf4",
              border: "#bbf7d0",
            }
          : precisionM <= 100
            ? {
                label: "WiFi · Buena precisión",
                color: "#166534",
                bg: "#f0fdf4",
                border: "#bbf7d0",
              }
            : precisionM <= 2000
              ? {
                  label: "Red móvil · Precisión moderada",
                  color: "#713f12",
                  bg: "#fefce8",
                  border: "#fef08a",
                }
              : {
                  label: "IP del proveedor · Baja precisión",
                  color: "#9a3412",
                  bg: "#fff7ed",
                  border: "#fed7aa",
                };

    return (
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 6,
          background: quality?.bg ?? "#f0fdf4",
          border: `1px solid ${quality?.border ?? "#bbf7d0"}`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: quality?.color ?? "#166534",
            fontWeight: 600,
          }}
        >
          <MapPin size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          Ubicación obtenida — acceso permitido
        </div>
        {precisionM !== null && (
          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              color: quality?.color,
              opacity: 0.85,
            }}
          >
            {quality?.label} · ±{precisionM.toLocaleString()} m de margen de
            error
          </div>
        )}
      </div>
    );
  }

  if (status === "requesting") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderRadius: 6,
          background: "#fffbeb",
          border: "1px solid #fde68a",
          marginBottom: 16,
          fontSize: 12,
          color: "#92400e",
          fontWeight: 500,
        }}
      >
        <Spinner className="h-3.5 w-3.5" />
        Obteniendo ubicación… Por favor acepte el permiso en el navegador.
      </div>
    );
  }

  // denied | unavailable
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 6,
        background: "#fef2f2",
        border: "1px solid #fecaca",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "#991b1b",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        <MapPinOff size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
        {status === "unavailable"
          ? "Geolocalización no disponible en este dispositivo."
          : "Permiso de ubicación denegado — acceso bloqueado."}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "#7f1d1d", lineHeight: 1.5 }}>
        {status === "unavailable"
          ? "Este sistema requiere un dispositivo con soporte de geolocalización para registrar su acceso."
          : "Para acceder al sistema debe conceder permiso de ubicación. Haga clic en el ícono de candado o ubicación en la barra de direcciones de su navegador, seleccione «Permitir» y recargue la página."}
      </p>
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
