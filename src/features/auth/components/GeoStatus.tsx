import { useState, useEffect, useCallback } from "react";
import { getGeolocation } from "../api/auth.api";
import { toast } from "sonner";

export type GeoStatusValue = "requesting" | "granted" | "denied" | "unavailable";

export interface GeoCoords {
  latitud: number;
  longitud: number;
  precisionM: number;
}

export function useGeoLocation() {
  const [geoStatus, setGeoStatus] = useState<GeoStatusValue>("requesting");
  const [coords, setCoords] = useState<GeoCoords | null>(null);

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
    const geoStart = Date.now();
    getGeolocation()
      .then((c) => {
        const wait = Math.max(0, 1500 - (Date.now() - geoStart));
        setTimeout(() => { setCoords(c); setGeoStatus("granted"); }, wait);
      })
      .catch((err) => {
        const wait = Math.max(0, 1500 - (Date.now() - geoStart));
        setTimeout(() => {
          if (err?.message === "GEOLOCATION_UNAVAILABLE") setGeoStatus("unavailable");
          else setGeoStatus("denied");
        }, wait);
      });
  }, []);

  useEffect(() => {
    requestGeo();
  }, [requestGeo]);

  return { geoStatus, coords, requestGeo };
}

export function GeoStatusIndicator({
  status,
  onRetry,
}: {
  status: GeoStatusValue;
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
