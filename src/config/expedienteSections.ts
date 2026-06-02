/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURACIÓN DE ACCESO POR SECCIÓN — Expediente 360
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Cuando el equipo decida los permisos finales, SOLO edita este archivo.
 * Cada sección define un array de roles que pueden verla.
 * Si el array está vacío [] → nadie puede verla (útil para deshabilitar temporalmente).
 * Si quieres que TODOS los roles autenticados puedan verla → omite la sección
 * o pon todos los roles.
 *
 * Cualquier cambio aquí se propaga automáticamente a:
 *   1. El render del componente (se oculta el card completo)
 *   2. La llamada a la API (el hook no hace fetch si no tienes acceso)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { UserRole } from '@/stores/authStore'

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

/**
 * Mapa de roles permitidos por sección.
 * Edita este objeto para ajustar permisos — el resto del sistema se adapta solo.
 */
export const EXPEDIENTE_SECTION_ROLES: Record<SectionKey, UserRole[]> = {
  // ── Siempre visible para quien pueda abrir el expediente ──────────────────
  datosPersonales: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'PACIENTE'],

  // ── Sección clínica — mediciones con historial ────────────────────────────
  somatometria: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'],

  // ── Gráficas y análisis de laboratorio ───────────────────────────────────
  tendenciaResultados: ['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA'],
  perfilLaboratorio:   ['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA'],

  // ── Vista simplificada solo para el paciente ─────────────────────────────
  analisisSimplificado: ['PACIENTE'],

  // ── Biobanco ──────────────────────────────────────────────────────────────
  muestrasBiobanco: ['ADMINISTRADOR', 'MEDICO', 'ENCARGADO'],

  // ── Prueba escalón ────────────────────────────────────────────────────────
  pruebaEscalon: ['ADMINISTRADOR', 'MEDICO'],

  // ── Citas ─────────────────────────────────────────────────────────────────
  citas: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'PACIENTE'],

  // ── Estudios médicos ──────────────────────────────────────────────────────
  estudios: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'LABORATORISTA'],

  // ── Exámenes de laboratorio ───────────────────────────────────────────────
  examenes: ['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA'],

  // ── Documentos del expediente ─────────────────────────────────────────────
  documentos: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'PACIENTE'],
}
