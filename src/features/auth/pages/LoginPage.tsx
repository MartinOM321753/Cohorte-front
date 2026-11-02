import { useState, useEffect, useRef, useCallback } from "react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "../schemas/login.schema";
import { loginUser, getGeolocation } from "../api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { resolveHomeRoute } from "@/config/featurePermisos";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
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

type GeoStatus = "requesting" | "granted" | "denied" | "unavailable";

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

// ── Geolocation status within the card ───────────────────────────────────
function GeoStatus({
  status,
  onRetry,
}: {
  status: GeoStatus;
  onRetry: () => void;
}) {
  if (status === "granted") return null;

  if (status === "requesting") {
    return (
      <div className="geo-status geo-requesting">
        <div className="geo-spinner-wrap">
          <div className="geo-spinner-pulse" />
          <svg className="geo-spinner-ring" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="17" stroke="#b6d4c5" strokeWidth="3" />
            <path
              d="M20 3a17 17 0 0 1 17 17"
              stroke="#3a6b50"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <svg className="geo-pin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        </div>
        <span>Obteniendo su ubicación…</span>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="geo-status geo-denied">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
        <span>Permiso de ubicación no concedido.</span>
        <span
          className="geo-retry-link"
          role="button"
          tabIndex={0}
          onClick={onRetry}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onRetry(); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reintentar
        </span>
      </div>
    );
  }

  return (
    <div className="geo-status geo-unavailable">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
      <span>Geolocalización no disponible en este navegador.</span>
    </div>
  );
}

// ── Canvas toroidal field ────────────────────────────────────────────────
function useConnectionField(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0, h = 0, dpr = 1, frame = 0, previous = 0, time = 0, focused = false;
    const pointer = { x: -2000, y: -2000 };
    const follow = { x: 0, y: 0 };
    const particles = Array.from({ length: 80 }, (_, i) => ({
      u: (i * 0.61803398875) % 1,
      v: (i * 0.381966 + 0.13) % 1,
      r: 0.5 + (i % 5) * 0.24,
      phase: i * 1.7,
    }));

    function resize() {
      w = innerWidth;
      h = innerHeight;
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function point(u: number, v: number, t: number) {
      const R = 1.3, r = 0.30 + 0.035 * Math.sin(u * 5 + t);
      let x = (R + r * Math.cos(v)) * Math.cos(u);
      let y = (R + r * Math.cos(v)) * Math.sin(u);
      let z = r * Math.sin(v);
      const tilt = 0.49 + Math.sin(t * 0.11) * 0.11;
      let yy = y * Math.cos(tilt) - z * Math.sin(tilt);
      const zz = y * Math.sin(tilt) + z * Math.cos(tilt);
      const spin = 0.19 + Math.sin(t * 0.08) * 0.13;
      const xx = x * Math.cos(spin) - yy * Math.sin(spin);
      yy = x * Math.sin(spin) + yy * Math.cos(spin);
      const perspective = 3.8 / (3.8 + zz);
      const size = Math.min(w * 0.48, h * 0.57);
      return {
        x: w * 0.5 + xx * size * perspective + follow.x,
        y: h * 0.47 + yy * size * 0.9 * perspective + follow.y,
        z: zz,
        alpha: 0.12 + (zz + 1.6) / 3.2 * 0.28,
      };
    }

    function draw() {
      const c = ctx!;
      c.clearRect(0, 0, w, h);
      const t = time;
      follow.x += ((pointer.x > -1000 ? (pointer.x / w - 0.5) * 10 : 0) - follow.x) * 0.025;
      follow.y += ((pointer.y > -1000 ? (pointer.y / h - 0.5) * 8 : 0) - follow.y) * 0.025;

      const glow = c.createRadialGradient(w * 0.5, h * 0.47, 10, w * 0.5, h * 0.47, Math.min(w * 0.6, h * 0.65));
      glow.addColorStop(0, "rgba(70,113,72,.02)");
      glow.addColorStop(0.65, "rgba(114,143,81,.035)");
      glow.addColorStop(1, "rgba(10,28,22,0)");
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);

      const lanes = w < 650 ? 18 : 30;
      const segments = w < 650 ? 100 : 150;
      c.lineWidth = 0.55;
      for (let lane = 0; lane < lanes; lane++) {
        const v = (lane / lanes) * Math.PI * 2 + t * 0.055;
        c.beginPath();
        for (let k = 0; k <= segments; k++) {
          const u = (k / segments) * Math.PI * 2;
          const p = point(u, v + 0.16 * Math.sin(u * 3 + t * 0.18), t);
          if (k === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
        }
        c.strokeStyle = lane % 6 === 0 ? "rgba(199,172,118,.35)" : "rgba(148,194,136,.22)";
        c.stroke();
      }

      for (let rib = 0; rib < 78; rib++) {
        const u = (rib / 78) * Math.PI * 2 + t * 0.025;
        c.beginPath();
        for (let j = 0; j <= 18; j++) {
          const p = point(u, (j / 18) * Math.PI * 2 + t * 0.055, t);
          if (j === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
        }
        c.strokeStyle = "rgba(165,197,138,.075)";
        c.stroke();
      }

      for (let i = 0; i < 245; i++) {
        const u = ((i * 0.61803398875) % 1) * Math.PI * 2 + t * 0.08;
        const v = ((i * 0.41421356) % 1) * Math.PI * 2 + t * 0.055;
        const p = point(u, v, t);
        const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
        const near = Math.max(0, 1 - d / 160);
        const pulse = 0.5 + 0.5 * Math.sin(t * (0.8 + (i % 4) * 0.13) + i * 2);
        const sz = (i % 17 === 0 ? 2 : i % 5 === 0 ? 1.3 : 0.65) * (1 + near * 0.7);
        c.beginPath();
        c.arc(p.x, p.y, sz, 0, Math.PI * 2);
        c.fillStyle = i % 9 === 0
          ? `rgba(228,205,149,${0.3 + pulse * 0.4 + near * 0.2})`
          : `rgba(193,225,174,${p.alpha + pulse * 0.2 + near * 0.25})`;
        c.fill();
        if (i % 17 === 0 || near > 0.45) {
          const halo = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 7);
          halo.addColorStop(0, `rgba(215,224,171,${0.12 + near * 0.13})`);
          halo.addColorStop(1, "rgba(215,224,171,0)");
          c.fillStyle = halo;
          c.fillRect(p.x - sz * 7, p.y - sz * 7, sz * 14, sz * 14);
        }
      }

      for (let spark = 0; spark < 7; spark++) {
        const u = t * (focused ? 0.17 : 0.10) + spark * 0.9;
        const v = spark * 1.8 + t * 0.055;
        for (let trail = 0; trail < 18; trail++) {
          const p = point(u - trail * 0.007, v, t);
          const alpha = (1 - trail / 18) * 0.65;
          c.beginPath();
          c.arc(p.x, p.y, trail === 0 ? 1.8 : 1, 0, Math.PI * 2);
          c.fillStyle = `rgba(244,226,174,${alpha})`;
          c.fill();
        }
      }

      for (let body = 0; body < 12; body++) {
        const velocity = 0.17 + (body % 4) * 0.035;
        const u = t * velocity + body * 2.399963;
        const v = body * 0.72 + t * 0.055;
        const p = point(u, v, t);
        const radius = 1.8 + (body % 3) * 0.65;
        const depth = 0.65 + (p.z + 1.6) / 6.4;
        for (let tail = 20; tail > 0; tail--) {
          const q = point(u - tail * 0.009, v, t);
          c.beginPath();
          c.arc(q.x, q.y, radius * 0.45, 0, Math.PI * 2);
          c.fillStyle = `rgba(229,225,191,${(1 - tail / 21) * 0.20 * depth})`;
          c.fill();
        }
        const halo = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 9);
        halo.addColorStop(0, `rgba(247,239,202,${0.25 * depth})`);
        halo.addColorStop(0.28, `rgba(224,231,191,${0.08 * depth})`);
        halo.addColorStop(1, "rgba(224,231,191,0)");
        c.fillStyle = halo;
        c.fillRect(p.x - radius * 9, p.y - radius * 9, radius * 18, radius * 18);
        c.beginPath();
        c.arc(p.x, p.y, radius * depth, 0, Math.PI * 2);
        c.fillStyle = body % 3 === 0 ? "#eee0b4" : "#f0f4df";
        c.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        const x = a.u * w + Math.sin(t * 0.08 + a.phase) * 12;
        const y = ((a.v * h - t * (1 + (i % 3) * 0.2)) % h + h) % h;
        const flicker = 0.18 + 0.17 * (0.5 + 0.5 * Math.sin(t * 0.8 + a.phase));
        c.fillStyle = `rgba(217,227,190,${flicker})`;
        c.beginPath();
        c.arc(x, y, a.r, 0, Math.PI * 2);
        c.fill();
      }

      c.strokeStyle = "rgba(178,197,150,.13)";
      c.lineWidth = 0.6;
      for (const x of [24, w - 24]) {
        for (const y of [h * 0.25, h * 0.5, h * 0.75]) {
          c.beginPath();
          c.moveTo(x - 3, y); c.lineTo(x + 3, y);
          c.moveTo(x, y - 3); c.lineTo(x, y + 3);
          c.stroke();
        }
      }
    }

    function tick(now: number) {
      if (document.hidden) { frame = 0; return; }
      if (now - previous > 32) {
        time += Math.min((now - previous) / 1000, 0.1) * (reduce.matches ? 0.2 : 1.5);
        previous = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(frame);
      previous = performance.now();
      draw();
      frame = requestAnimationFrame(tick);
    }

    const onResize = () => resize();
    const onPointerMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; };
    const onPointerLeave = () => { pointer.x = -2000; pointer.y = -2000; };
    const onFocus = () => { focused = true; };
    const onBlur = () => { focused = false; };
    const onVisChange = () => { if (document.hidden) cancelAnimationFrame(frame); else start(); };
    const onReduceChange = () => start();

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisChange);
    reduce.addEventListener("change", onReduceChange);

    const inputs = document.querySelectorAll(".login-page input");
    inputs.forEach((input) => {
      input.addEventListener("focus", onFocus);
      input.addEventListener("blur", onBlur);
    });

    resize();
    start();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisChange);
      reduce.removeEventListener("change", onReduceChange);
      inputs.forEach((input) => {
        input.removeEventListener("focus", onFocus);
        input.removeEventListener("blur", onBlur);
      });
    };
  }, [canvasRef]);
}

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
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("requesting");
  const [coords, setCoords] = useState<{
    latitud: number;
    longitud: number;
    precisionM: number;
  } | null>(null);

  const requestGeo = useCallback(async () => {
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        if (perm.state === "denied") {
          toast.info(
            "Para conceder el permiso, haga clic en el ícono de candado (o de ubicación) en la barra de direcciones del navegador y permita el acceso a la ubicación. Después presione Reintentar.",
            { duration: 8000 },
          );
        }
      } catch {}
    }

    setGeoStatus("requesting");
    getGeolocation()
      .then((c) => {
        setCoords(c);
        setGeoStatus("granted");
      })
      .catch((err) => {
        if (err?.message === "GEOLOCATION_UNAVAILABLE") {
          setGeoStatus("unavailable");
        } else {
          setGeoStatus("denied");
        }
      });
  }, []);

  useEffect(() => {
    requestGeo();
  }, [requestGeo]);

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
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  // ── Recovery dialog ──────────────────────────────────────────────────
  const openRecovery = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);
  const closeRecovery = useCallback(() => {
    dialogRef.current?.close();
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
                  onClick={openRecovery}
                >
                  Recuperar acceso
                </button>
              </div>

              {/* Geolocation status */}
              <GeoStatus status={geoStatus} onRetry={requestGeo} />

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

      {/* ── Recovery dialog ────────────────────────────────────────── */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            const b = dialogRef.current!.getBoundingClientRect();
            if (
              e.clientX < b.left || e.clientX > b.right ||
              e.clientY < b.top || e.clientY > b.bottom
            ) closeRecovery();
          }
        }}
      >
        <button type="button" className="dialog-close" aria-label="Cerrar" onClick={closeRecovery}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
        <div className="dialog-emblem">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m4 6 8 7 8-7" />
          </svg>
        </div>
        <p className="eyebrow">Ayuda de acceso</p>
        <h2>Volvamos a conectar.</h2>
        <p>
          Contacte al equipo de la Cohorte para solicitar orientación sobre su
          acceso institucional.
        </p>
        <a className="contact-link" href="mailto:cohorteuiess@gmail.com">
          cohorteuiess@gmail.com
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12h15m-6-6 6 6-6 6" />
          </svg>
        </a>
      </dialog>
    </div>
  );
}
