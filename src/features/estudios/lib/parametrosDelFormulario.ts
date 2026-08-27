import type { ParametroEstudio, ResultadoEstudioResponse, TipoParametro } from '@/types/api'

/** Un parámetro tal como lo maneja un formulario de edición. */
export type ParametroEnFormulario = ParametroEstudio & {
  /**
   * El parámetro ya no está en el catálogo vigente, pero este estudio tiene un
   * resultado suyo. Se muestra para poder conservarlo —y corregirlo—, marcado
   * como fuera de uso.
   */
  heredado?: boolean
}

/**
 * Qué parámetros debe manejar el formulario al editar un estudio ya guardado.
 *
 * <p>No basta con el catálogo vigente. Un estudio puede tener resultados de
 * parámetros que hoy ya no aparecen ahí —desactivados, o que dejaron de ofrecerse
 * por cualquier otro motivo—, y el formulario es quien decide qué se guarda: lo
 * que no aparezca en él, al guardar se borra, porque el servidor reemplaza la
 * lista completa de resultados por la que recibe.</p>
 *
 * <p>Por eso se devuelve la unión: el catálogo que se ofrece hoy, más un parámetro
 * reconstruido por cada resultado que quedó sin pareja. La reconstrucción no
 * necesita saber por qué falta —desactivado, renombrado, retirado—; le basta con
 * que exista un valor guardado que nadie debería perder por abrir la pantalla.</p>
 */
export function parametrosDelFormulario(
  catalogo: ParametroEstudio[],
  resultados: ResultadoEstudioResponse[],
): ParametroEnFormulario[] {
  const salida: ParametroEnFormulario[] = [...catalogo]
  const conocidos = new Set(catalogo.map((p) => p.id))

  for (const r of resultados) {
    if (r.idParametro == null || conocidos.has(r.idParametro)) continue
    conocidos.add(r.idParametro)
    salida.push({
      id: r.idParametro,
      nombre: r.parametro,
      tipo: tipoSegunElValor(r),
      unidad: undefined,
      opciones: undefined,
      heredado: true,
    } as ParametroEnFormulario)
  }

  return salida
}

/**
 * De qué tipo era el parámetro, deducido del valor que dejó guardado.
 *
 * <p>Es la única pista disponible cuando el parámetro ya no está en el catálogo:
 * la fila del resultado guarda el valor en la columna que corresponde a su tipo.
 * TEXTO_OPCIONES no se distingue de TEXTO —ambos escriben en la misma columna—,
 * y da igual: sin catálogo tampoco tendríamos sus opciones, así que se edita como
 * texto libre, que conserva el valor tal cual.</p>
 */
function tipoSegunElValor(r: ResultadoEstudioResponse): TipoParametro {
  if (r.valorNumerico != null) return 'NUMERICO'
  if (r.valorBooleano != null) return 'BOOLEANO'
  return 'TEXTO'
}
