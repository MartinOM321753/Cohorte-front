import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validateResetToken, resetPassword } from "../api/auth.api";
import { Spinner } from "@/components/ui/spinner";
import { AuthShell } from "../components/AuthShell";
import { useCardFit } from "../hooks/useCardFit";
import { GeoStatusIndicator, useGeoLocation } from "../components/GeoStatus";
import {
  PASSWORD_REQUIREMENTS_TEXT,
  strongPasswordSchema,
} from "../schemas/password.schema";

const schema = z
  .object({
    nuevaPassword: z.string().pipe(strongPasswordSchema),
    confirmarPassword: z.string().min(1, "Confirme su contraseña"),
  })
  .refine((d) => d.nuevaPassword === d.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });
type FormData = z.infer<typeof schema>;

type TokenState = "validating" | "valid" | "invalid" | "expired";

function normalizeErrorMessage(message: string) {
  return message
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function tokenStateFromMessage(message: string): TokenState {
  const normalized = normalizeErrorMessage(message);
  return normalized.includes("expir") ? "expired" : "invalid";
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [tokenState, setTokenState] = useState<TokenState>("validating");
  const [tokenError, setTokenError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { fitRef, stageRef, cardRef } = useCardFit();
  const { geoStatus, coords, requestGeo } = useGeoLocation();

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      setTokenError(
        "El enlace de recuperación no es válido o ya fue utilizado.",
      );
      return;
    }
    validateResetToken(token)
      .then(() => setTokenState("valid"))
      .catch((err: any) => {
        const msg: string = err?.response?.data?.message || "";
        setTokenError(msg || "El enlace ha expirado o ya fue utilizado.");
        setTokenState(tokenStateFromMessage(msg));
      });
  }, [token]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await resetPassword(token, data.nuevaPassword, coords);
      setSuccess(true);
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message || err?.message || "Error al actualizar la contraseña.";
      const normalizedMsg = normalizeErrorMessage(msg);
      if (
        normalizedMsg.includes("expir") ||
        normalizedMsg.includes("valid") ||
        normalizedMsg.includes("utiliz")
      ) {
        setTokenState(tokenStateFromMessage(msg));
        setTokenError(msg);
      } else {
        setError("nuevaPassword", { message: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthShell stageRef={stageRef}>
        <div className="card-fit" ref={fitRef}>
          <section className="access-card" ref={cardRef} aria-labelledby="success-title">
            <div className="card-edge" aria-hidden="true" />

            <div className="form-heading">
              <div className="icon-circle icon-circle--success">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                  <path d="m8 12 3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 id="success-title">¡Contraseña actualizada!</h1>
              <p className="subtitle">
                Su contraseña se actualizó correctamente. Ya puede iniciar sesión
                con sus nuevas credenciales.
              </p>
            </div>

            <button
              className="submit-button"
              type="button"
              onClick={() => navigate("/login")}
            >
              Ir al inicio de sesión
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

  // ── Invalid / expired token ───────────────────────────────────────────
  if (tokenState === "invalid" || tokenState === "expired") {
    return (
      <AuthShell stageRef={stageRef}>
        <div className="card-fit" ref={fitRef}>
          <section className="access-card" ref={cardRef} aria-labelledby="error-title">
            <div className="card-edge" aria-hidden="true" />

            <div className="form-heading">
              <div className="icon-circle icon-circle--error">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                  <path d="m15 9-6 6m0-6 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </div>
              <h1 id="error-title">Enlace inválido</h1>
              <p className="subtitle">{tokenError}</p>
            </div>

            <button
              className="submit-button"
              type="button"
              onClick={() => navigate("/forgot-password")}
            >
              Solicitar nuevo enlace
            </button>

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

  // ── Validating token ──────────────────────────────────────────────────
  if (tokenState === "validating") {
    return (
      <AuthShell stageRef={stageRef}>
        <div className="card-fit" ref={fitRef}>
          <section className="access-card" ref={cardRef} style={{ textAlign: "center" }}>
            <div className="card-edge" aria-hidden="true" />
            <div style={{ padding: "32px 0" }}>
              <Spinner className="h-8 w-8 mx-auto mb-4" />
              <p style={{ fontSize: 15, color: "var(--muted)" }}>
                Verificando enlace…
              </p>
            </div>
          </section>
        </div>
      </AuthShell>
    );
  }

  // ── Form: new password ────────────────────────────────────────────────
  return (
    <AuthShell stageRef={stageRef}>
      <div className="card-fit" ref={fitRef}>
        <section className="access-card" ref={cardRef} aria-labelledby="reset-title">
          <div className="card-edge" aria-hidden="true" />

          <div className="form-heading">
            <p className="eyebrow">Restablecer contraseña</p>
            <h1 id="reset-title">Nueva contraseña</h1>
            <p className="subtitle">
              Elija una contraseña segura para su cuenta institucional.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* New password */}
            <div className="field-group">
              <label>Nueva contraseña</label>
              <div className={`input-shell${errors.nuevaPassword ? " input-shell--error" : ""}`}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={PASSWORD_REQUIREMENTS_TEXT}
                  autoComplete="new-password"
                  autoFocus
                  {...register("nuevaPassword")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar" : "Mostrar"}
                >
                  {showPass ? (
                    <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m1 1 22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
                <span className="focus-line" />
              </div>
              {errors.nuevaPassword && (
                <p className="field-error">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 13, height: 13, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                  {errors.nuevaPassword.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="field-group">
              <label>Confirmar contraseña</label>
              <div className={`input-shell${errors.confirmarPassword ? " input-shell--error" : ""}`}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repita la contraseña"
                  autoComplete="new-password"
                  {...register("confirmarPassword")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                >
                  {showConfirm ? (
                    <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m1 1 22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
                <span className="focus-line" />
              </div>
              {errors.confirmarPassword && (
                <p className="field-error">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 13, height: 13, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                  {errors.confirmarPassword.message}
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
                  <span style={{ marginLeft: 8 }}>Actualizando…</span>
                </>
              ) : (
                <span>Establecer nueva contraseña</span>
              )}
            </button>
          </form>

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
