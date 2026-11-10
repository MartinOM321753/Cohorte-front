import { useState, useEffect, useRef, useCallback } from "react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "../schemas/login.schema";
import { loginUser } from "../api/auth.api";
import { useConnectionField } from "../hooks/useConnectionField";
import { useAuthStore } from "@/stores/authStore";
import { resolveHomeRoute } from "@/config/featurePermisos";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { GeoStatusIndicator, useGeoLocation } from "../components/GeoStatus";
import "./login.css";

import cohorteLogo from "@/assets/cohorte-logo.png";
import logoImss from "@/assets/instituciones/imss.png";
import logoUnamMedicina from "@/assets/instituciones/unam-medicina.png";
import logoInsp from "@/assets/instituciones/insp.png";
import logoInmegen from "@/assets/instituciones/inmegen.png";
import logoNutricion from "@/assets/instituciones/nutricion.png";
import logoPsiquiatria from "@/assets/instituciones/psiquiatria.png";
import logoCipps from "@/assets/instituciones/cipps.png";
import logoDiabetes from "@/assets/instituciones/diabetes-morelos.png";

// ── Institutions ─────────────────────────────────────────────────────────
const INSTITUTIONS = [
  { src: logoImss, alt: "IMSS" },
  { src: logoUnamMedicina, alt: "Facultad de Medicina, UNAM" },
  { src: logoInsp, alt: "INSP" },
  { src: logoInmegen, alt: "INMEGEN" },
  { src: logoNutricion, alt: "Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán" },
  { src: logoPsiquiatria, alt: "Instituto Nacional de Psiquiatría Ramón de la Fuente Muñiz" },
  { src: logoCipps, alt: "CIPPS, UNAM" },
  { src: logoDiabetes, alt: "Asociación Mexicana de Diabetes en Morelos" },
];

// ── Card auto-scale ──────────────────────────────────────────────────────
function useCardFit(
  stageRef: React.RefObject<HTMLElement | null>,
  cardRef: React.RefObject<HTMLElement | null>,
  fitRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    const fit = fitRef.current;
    if (!stage || !card || !fit) return;

    let queued = false;
    const measure = () => {
      queued = false;
      const css = getComputedStyle(stage);
      const available = stage.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
      const scale = Math.min(1, Math.max(0.68, available / card.offsetHeight));
      fit.style.setProperty("--card-fit", scale.toFixed(4));
    };
    const schedule = () => {
      if (!queued) { queued = true; requestAnimationFrame(measure); }
    };

    const ro1 = new ResizeObserver(schedule);
    const ro2 = new ResizeObserver(schedule);
    ro1.observe(stage);
    ro2.observe(card);
    window.addEventListener("resize", schedule, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener("resize", schedule, { passive: true });
    document.fonts.ready.then(schedule);
    measure();

    return () => {
      ro1.disconnect();
      ro2.disconnect();
      window.removeEventListener("resize", schedule);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", schedule);
    };
  }, [stageRef, cardRef, fitRef]);
}

// ═════════════════════════════════════════════════════════════════════════
// LoginPage
// ═════════════════════════════════════════════════════════════════════════
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, hasPermiso } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // ── Geolocation ──────────────────────────────────────────────────────
  const { geoStatus, coords, requestGeo } = useGeoLocation();

  // ── Auth redirect ────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated)
      navigate(resolveHomeRoute(hasPermiso), { replace: true });
  }, [isAuthenticated, navigate, hasPermiso]);

  // ── Form ─────────────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (!coords) {
      toast.error(
        "Se requiere su ubicación para continuar. Otorgue el permiso desde el ícono de candado o de ubicación en la barra de direcciones e intente nuevamente.",
      );
      return;
    }
    setIsLoading(true);
    try {
      const response = await loginUser(data, coords);
      if (!response.user) throw new Error("Respuesta de servidor inválida");
      const ok = await login({
        user: response.user,
        mustChangePassword: response.mustChangePassword,
        permisos: response.permisos,
        roles: response.roles,
        esParticipante: response.esParticipante,
      });
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

  // ── Refs ─────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  useConnectionField(canvasRef);
  useCardFit(stageRef, cardRef, fitRef);

  // ── Card pointer tracking (radial light) ─────────────────────────────
  const onCardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", e.clientX - r.left + "px");
      card.style.setProperty("--spot-y", e.clientY - r.top + "px");
    },
    [],
  );
  const onCardPointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.removeProperty("--spot-x");
    card.style.removeProperty("--spot-y");
  }, []);

  return (
    <div className="login-page">
      {/* ── Background layers ──────────────────────────────────────── */}
      <canvas ref={canvasRef} className="connection-field" aria-hidden="true" />
      <div className="ancestral-mist" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div className="scene-vignette" aria-hidden="true" />
      <div className="scene-grain" aria-hidden="true" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="site-header">
        <span className="brand">
          <img src={cohorteLogo} alt="" width="60" height="60" />
          <span>
            Cohorte de<br />
            <strong>Trabajadores de la Salud</strong>
          </span>
        </span>
      </header>

      {/* ── Main stage ─────────────────────────────────────────────── */}
      <main className="access-stage" ref={stageRef}>
        <div className="scene-caption" aria-hidden="true">
          <span className="caption-rule" />
          <p>
            La ciencia avanza<br />
            cuando <em>conectamos.</em>
          </p>
          <span className="caption-small">Personas · Datos · Conocimiento</span>
        </div>

        <div className="card-fit" ref={fitRef}>
          <section
            className="access-card"
            ref={cardRef}
            aria-labelledby="login-title"
            onPointerMove={onCardPointerMove}
            onPointerLeave={onCardPointerLeave}
          >
            <div className="card-edge" aria-hidden="true" />

            {/* Heading */}
            <div className="form-heading">
              <p className="eyebrow">Tu punto de conexión</p>
              <h1 id="login-title">
                El siguiente paso<br />
                empieza <span>contigo.</span>
              </h1>
              <p>Inicia sesión en tu espacio de trabajo.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Identifier */}
              <div className="field-group">
                <label htmlFor="identifier">Usuario o correo electrónico</label>
                <Controller
                  name="identifier"
                  control={control}
                  render={({ field }) => (
                    <div className="input-shell">
                      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                      </svg>
                      <input
                        id="identifier"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Escribe tu usuario o correo"
                        disabled={isLoading}
                        {...field}
                      />
                      <span className="focus-line" aria-hidden="true" />
                    </div>
                  )}
                />
                {errors.identifier && (
                  <div className="field-error">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {errors.identifier.message}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="field-group">
                <label htmlFor="password">Contraseña</label>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <div className="input-shell">
                      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="4.5" y="10" width="15" height="11" rx="2.5" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
                      </svg>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Escribe tu contraseña"
                        disabled={isLoading}
                        {...field}
                        onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                        onBlur={() => {
                          setCapsLock(false);
                          field.onBlur();
                        }}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span className="eye-slash" aria-hidden="true" />
                      </button>
                      <span className="focus-line" aria-hidden="true" />
                    </div>
                  )}
                />
                {capsLock && (
                  <div className="caps-warning" role="status">
                    Bloqueo de mayúsculas activado
                  </div>
                )}
                {errors.password && (
                  <div className="field-error">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {errors.password.message}
                  </div>
                )}
              </div>

              {/* Options row */}
              <div className="form-options">
                <label className="remember">
                  <input type="checkbox" />
                  <span>Mantener sesión iniciada</span>
                </label>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                >
                  Recuperar acceso
                </button>
              </div>

              {/* Geolocation status */}
              <GeoStatusIndicator status={geoStatus} onRetry={requestGeo} />

              {/* Submit */}
              <button
                className="submit-button"
                type="submit"
                disabled={isLoading || geoStatus !== "granted"}
              >
                {isLoading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span style={{ marginLeft: 8 }}>Iniciando sesión…</span>
                  </>
                ) : (
                  <span>Iniciar sesión</span>
                )}
              </button>

              {/* Access note */}
              <div className="access-note">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
                  <path d="m8.5 12 2.5 2.5 4.5-5" />
                </svg>
                <span>Acceso para personal autorizado</span>
              </div>
            </form>

            {/* Card foot */}
            <div className="card-foot">
              <span className="foot-line" />
              <span>Cohorte de Trabajadores de la Salud</span>
              <span className="foot-line" />
            </div>
          </section>
        </div>

        <div className="scene-index" aria-hidden="true">
          <span>Observar</span><i /><span>Conectar</span><i /><span>Comprender</span>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="institution-strip">
          <p>UNA VISIÓN COMPARTIDA</p>
          <div className="institution-marquee">
            <div className="institution-row" aria-label="Instituciones colaboradoras">
              {INSTITUTIONS.map((inst, i) => (
                <img key={i} src={inst.src} alt={inst.alt} />
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
