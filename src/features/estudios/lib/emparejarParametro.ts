import type { ParametroEstudio, ResultadoEstudioResponse } from '@/types/api'

/**
 * Encuentra a qué parámetro corresponde un resultado ya guardado.
 *
 * Se empareja por id. Antes se hacía por nombre —`p.nombre === r.parametro`— y eso
 * ata los resultados históricos a la ortografía exacta que tenía el parámetro el
 * día de la captura: renombrarlo, o corregirle una tilde, desconectaba de golpe
 * todos sus resultados anteriores. Al quedarse sin pareja, la pantalla los
 * descartaba en silencio y el estudio se veía incompleto.
 *
 * El nombre se conserva como respaldo para los resultados que se guardaron antes
 * de que la respuesta incluyera el id, que de otro modo dejarían de emparejar
 * justo al desplegar este cambio.
 */
export function emparejarParametro(
  parametros: ParametroEstudio[],
  resultado: Pick<ResultadoEstudioResponse, 'idParametro' | 'parametro'>,
): ParametroEstudio | undefined {
  if (resultado.idParametro != null) {
    const porId = parametros.find((p) => p.id === resultado.idParametro)
    if (porId) return porId
  }
  return parametros.find((p) => p.nombre === resultado.parametro)
}
