import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPassword } from "../api/auth.api";
import { Spinner } from "@/components/ui/spinner";
import { AuthShell } from "../components/AuthShell";
import { useCardFit } from "../hooks/useCardFit";
import { GeoStatusIndicator, useGeoLocation } from "../components/GeoStatus";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El correo es obligatorio")
    .email("Ingrese un correo electrónico válido"),
});
type FormData = z.infer<typeof schema>;

function lsKey(email: string) {
  return `cohorte_fpp_${email.trim().toLowerCase()}`;
}

function getRateLimitSecondsLeft(email: string): number {
  const stored = localStorage.getItem(lsKey(email));
  if (!stored) return 0;
  const elapsed = (Date.now() - parseInt(stored, 10)) / 1000;
  const remaining = 3600 - elapsed;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

function setRateLimitNow(email: string) {
  localStorage.setItem(lsKey(email), String(Date.now()));
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { fitRef, stageRef, cardRef } = useCardFit();
  const { geoStatus, coords, requestGeo } = useGeoLocation();

  const onSubmit = async (data: FormData) => {
    const secsLeft = getRateLimitSecondsLeft(data.email);
    if (secsLeft > 0) {
      const mins = Math.ceil(secsLeft / 60);
      setRateLimitMsg(
        `Ya enviamos un correo de recuperación a esta cuenta. Puede solicitar otro en ${mins} minuto${mins !== 1 ? "s" : ""}.`,
      );
      return;
    }

    setIsLoading(true);
    setRateLimitMsg("");
    try {
      await forgotPassword(data.email, coords);
      setRateLimitNow(data.email);
      setSentEmail(data.email);
      setSent(true);
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message || err?.message || "";
      if (
        err?.response?.status === 429 ||
        msg.toLowerCase().includes("hora")
      ) {
        setRateLimitNow(data.email);
        setRateLimitMsg(
          msg ||
            "Ya se envió un correo en la última hora. Revise su bandeja de entrada.",
        );
      } else {
        setError("email", {
          message: msg || "Error al enviar. Intente nuevamente.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell stageRef={stageRef}>
        <div className="card-fit" ref={fitRef}>
          <section className="access-card" ref={cardRef} aria-labelledby="sent-title">
            <div className="card-edge" aria-hidden="true" />

            <div className="form-heading">
              <div className="icon-circle icon-circle--success">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                  <path d="m8 12 3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 id="sent-title">Revise su correo</h1>
              <p className="subtitle">
                Si <strong>{sentEmail}</strong> está vinculado a una cuenta,
                recibirá un enlace para restablecer su contraseña en los
                próximos minutos.
              </p>
            </div>

            <div className="info-box">
              <svg className="info-box-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p>
                El enlace expira en <strong>15 minutos</strong>. Si no lo
                encuentra, revise también la carpeta de spam.
              </p>
            </div>

            <button
              className="back-button"
              type="button"
              onClick={() => navigate("/login")}
            >
              <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 12H5m0 0 6 6m-6-6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Volver al inicio de sesión
            </button>

            <div className="card-foot">
              <span className="foot-line" />
              <span>Cohorte de Trabajadores de la Salud</span>
              <span className="foot-line" />
            </div>
          </section>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell stageRef={stageRef}>
      <div className="card-fit" ref={fitRef}>
        <section className="access-card" ref={cardRef} aria-labelledby="forgot-title">
          <div className="card-edge" aria-hidden="true" />

          <div className="form-heading">
            <p className="eyebrow">Recuperar contraseña</p>
            <h1 id="forgot-title">¿Olvidó su contraseña?</h1>
            <p className="subtitle">
              Ingrese el correo electrónico vinculado a su cuenta institucional y
              le enviaremos un enlace para restablecerla.
            </p>
          </div>

          {rateLimitMsg && (
            <div className="rate-limit-alert">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              <span>{rateLimitMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field-group">
              <label>Correo electrónico</label>
              <div className={`input-shell${errors.email ? " input-shell--error" : ""}`}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m4 6 8 7 8-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  type="email"
                  placeholder="su.correo@imss.gob.mx"
                  autoComplete="email"
                  autoFocus
                  {...register("email")}
                />
                <span className="focus-line" />
              </div>
              {errors.email && (
                <p className="field-error">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 13, height: 13, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                  {errors.email.message}
                </p>
              )}
            </div>

            <GeoStatusIndicator status={geoStatus} onRetry={requestGeo} />

            <button
              className="submit-button"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span style={{ marginLeft: 8 }}>Enviando enlace…</span>
                </>
              ) : (
                <span>Enviar enlace de recuperación</span>
              )}
            </button>
          </form>

          <button
            className="back-button"
            type="button"
            onClick={() => navigate("/login")}
          >
            <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5m0 0 6 6m-6-6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver al inicio de sesión
          </button>

          <div className="card-foot">
            <span className="foot-line" />
            <span>Cohorte de Trabajadores de la Salud</span>
            <span className="foot-line" />
          </div>
        </section>
      </div>
    </AuthShell>
  );
}
