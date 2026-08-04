/**
 * El backend responde a un fallo de validación con un mensaje genérico
 * («Favor de corregir los siguientes errores») y el detalle por campo dentro de
 * `data`, como un objeto { campo: motivo }. Mostrando solo `message` la persona
 * lee que hay errores pero no cuáles: esta función arma el texto completo.
 *
 * `etiquetas` traduce el nombre técnico del campo al que se ve en el formulario;
 * si un campo no está en el mapa, se muestra tal cual antes que ocultarlo.
 */
export function mensajeErrorApi(
  err: unknown,
  respaldo: string,
  etiquetas?: Record<string, string>,
): string {
  const cuerpo = (err as any)?.response?.data
  const mensaje: string = cuerpo?.message || (err as any)?.message || respaldo
  const detalle = cuerpo?.data

  if (!detalle || typeof detalle !== 'object' || Array.isArray(detalle)) return mensaje

  const lineas = Object.entries(detalle)
    .filter((entrada): entrada is [string, string] => typeof entrada[1] === 'string')
    .map(([campo, motivo]) => `${etiquetas?.[campo] ?? campo}: ${motivo}`)

  return lineas.length > 0 ? `${mensaje} — ${lineas.join(' · ')}` : mensaje
}
