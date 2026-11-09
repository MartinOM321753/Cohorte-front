import { useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { useConnectionField } from "../hooks/useConnectionField";
import "../pages/login.css";

import cohorteLogo from "@/assets/cohorte-logo.png";
import logoImss from "@/assets/instituciones/imss.png";
import logoUnamMedicina from "@/assets/instituciones/unam-medicina.png";
import logoInsp from "@/assets/instituciones/insp.png";
import logoInmegen from "@/assets/instituciones/inmegen.png";
import logoNutricion from "@/assets/instituciones/nutricion.png";
import logoPsiquiatria from "@/assets/instituciones/psiquiatria.png";
import logoCipps from "@/assets/instituciones/cipps.png";
import logoDiabetes from "@/assets/instituciones/diabetes-morelos.png";

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

interface AuthShellProps {
  children: ReactNode;
  stageRef?: RefObject<HTMLElement | null>;
}

export function AuthShell({ children, stageRef }: AuthShellProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useConnectionField(canvasRef);

  return (
    <div className="login-page">
      <canvas ref={canvasRef} className="connection-field" aria-hidden="true" />
      <div className="ancestral-mist" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div className="scene-vignette" aria-hidden="true" />
      <div className="scene-grain" aria-hidden="true" />

      <header className="site-header">
        <span className="brand">
          <img src={cohorteLogo} alt="" width="60" height="60" />
          <span>
            Cohorte de<br />
            <strong>Trabajadores de la Salud</strong>
          </span>
        </span>
      </header>

      <main className="access-stage" ref={stageRef}>
        {children}
      </main>

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
