/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURACIÓN DE ACCESO POR SECCIÓN — Expediente 360
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Cada sección define el código de permiso requerido para verla.
 * Cualquier cambio aquí se propaga automáticamente a:
 *   1. El render del componente (se oculta el card completo)
 *   2. La llamada a la API (el hook no hace fetch si no tienes acceso)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type SectionKey =
  | 'datosPersonales'
  | 'somatometria'
  | 'tendenciaResultados'
  | 'perfilLaboratorio'
  | 'analisisSimplificado'
  | 'muestrasBiobanco'
  | 'pruebaEscalon'
  | 'citas'
  | 'estudios'
  | 'examenes'
  | 'documentos'

export const EXPEDIENTE_SECTION_PERMISOS: Record<SectionKey, string> = {
  datosPersonales: 'EXPEDIENTE_DATOS_PERSONALES',
  somatometria: 'EXPEDIENTE_SOMATOMETRIA',
  tendenciaResultados: 'EXPEDIENTE_RESULTADOS_LAB',
  perfilLaboratorio: 'EXPEDIENTE_PERFIL_LAB',
  analisisSimplificado: 'EXPEDIENTE_RESULTADOS_LAB',
  muestrasBiobanco: 'EXPEDIENTE_BIOBANCO',
  pruebaEscalon: 'EXPEDIENTE_PRUEBA_ESCALON',
  citas: 'EXPEDIENTE_CITAS',
  estudios: 'EXPEDIENTE_ESTUDIOS',
  examenes: 'EXPEDIENTE_EXAMENES',
  documentos: 'EXPEDIENTE_DOCUMENTOS',
}

// ── Backward compat: re-export the old types/names for any lingering imports ──
import type { UserRole } from '@/stores/authStore'

/** @deprecated Use EXPEDIENTE_SECTION_PERMISOS instead */
export const EXPEDIENTE_SECTION_ROLES: Record<SectionKey, UserRole[]> = {
  datosPersonales: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'PACIENTE'],
  somatometria: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'],
  tendenciaResultados: ['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA'],
  perfilLaboratorio: ['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA'],
  analisisSimplificado: ['PACIENTE'],
  muestrasBiobanco: ['ADMINISTRADOR', 'MEDICO', 'ENCARGADO'],
  pruebaEscalon: ['ADMINISTRADOR', 'MEDICO'],
  citas: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'PACIENTE'],
  estudios: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'LABORATORISTA'],
  examenes: ['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA'],
  documentos: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'PACIENTE'],
}
