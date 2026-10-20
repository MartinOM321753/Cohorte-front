/**
 * Qué preguntas se le hacen, dadas las respuestas que lleva **en la pantalla**.
 *
 * ## Por qué esto existe, siendo que el servidor ya lo calcula
 *
 * El servidor manda con cada bloque la lista de preguntas habilitadas, y es la
 * autoridad: la usa al guardar y al importar un volcado, y de ella sale la cuenta de
 * qué tan completo está un cuestionario. Pero la calcula con lo que hay *guardado*, y
 * mientras alguien contesta eso está siempre un paso atrás. El efecto era que había
 * que guardar y cambiar de bloque para que una pregunta se habilitara, se
 * deshabilitara o pasara a ser obligatoria.
 *
 * Así que la condición se resuelve aquí también, con lo que el participante acaba de
 * marcar. Esto es un espejo de `EvaluadorDependencias.java` y hay que mantener los dos
 * de acuerdo; si se separan, el síntoma es una pregunta que no se hace, y eso no se
 * nota hasta que falta el dato. De ahí las pruebas de al lado, que son las mismas que
 * las de Java.
 *
 * ## Dónde manda cada uno
 *
 * - La llave está **en el bloque cargado** → decide esta función. El veredicto del
 *   servidor para esa pregunta está viejo por definición: lo que importa es lo que la
 *   llave vale ahora en la pantalla.
 * - La llave está **fuera del bloque** → manda el servidor. Y no es una concesión: una
 *   llave de otro bloque no puede cambiar mientras se contesta este, así que su
 *   veredicto sigue siendo el bueno.
 *
 * El servidor conserva la última palabra al guardar, de modo que una diferencia entre
 * los dos se ve como un aviso, nunca como un dato perdido.
 */

export type OperadorDependencia = 'IGUAL' | 'DISTINTO' | 'EN'

/** Lo mínimo que hace falta saber de una pregunta para resolver su condición. */
export interface PreguntaConLlave {
  id: number
  codigo: string
  dependeDe?: string | null
  valorHabilitante?: string | null
  operadorDependencia?: OperadorDependencia | null
}

/**
 * @param preguntas   las del bloque que se está contestando
 * @param valores     lo que hay ahora en los campos, por id de pregunta. Una pregunta
 *                    sin contestar vale `''`, igual que una cuya respuesta guardada
 *                    traía una marca de ausencia: para la condición las dos son «no
 *                    sabemos», que es lo que habilita.
 * @param delServidor las que el servidor dio por habilitadas. Solo se consulta para
 *                    las preguntas cuya llave no viene en este bloque.
 * @returns los ids de las preguntas que sí se hacen
 */
export function calcularHabilitadas<P extends PreguntaConLlave>(
  preguntas: P[],
  valores: Record<number, string>,
  delServidor: Iterable<number>,
): Set<number> {
  const servidor = new Set(delServidor)
  const porCodigo = new Map<string, P>()
  for (const p of preguntas) porCodigo.set(p.codigo, p)

  const resuelto = new Map<number, boolean>()

  /** `enCurso` corta los anillos de llaves; sin él, un catálogo con un ciclo cuelga. */
  function decide(p: P, enCurso: Set<string>): boolean {
    const yaEsta = resuelto.get(p.id)
    if (yaEsta !== undefined) return yaEsta

    const resultado = calcular(p, enCurso)
    // Solo se memoriza lo que se resolvió sin ciclo: dentro de un anillo, el resultado
    // depende de por dónde se entró y guardarlo contaminaría a las demás.
    if (enCurso.size === 0) resuelto.set(p.id, resultado)
    return resultado
  }

  function calcular(p: P, enCurso: Set<string>): boolean {
    const llaveCodigo = p.dependeDe?.trim()
    if (!llaveCodigo) return true

    const esperado = p.valorHabilitante?.trim()
    // Depende de algo pero no se dijo de qué valor: el catálogo está incompleto y una
    // pregunta de más que se muestra se puede dejar en blanco. Esconderla, no.
    if (!esperado) return true

    const llave = porCodigo.get(llaveCodigo)
    // La llave vive en otro bloque, o el catálogo apunta a una pregunta que no existe.
    // En los dos casos el servidor sabe más que la pantalla.
    if (!llave) return servidor.has(p.id)

    if (enCurso.has(p.codigo)) return true
    const conEsta = new Set(enCurso)
    conEsta.add(p.codigo)

    // A la llave no se le preguntó: a esta tampoco le toca. Nótese la diferencia con el
    // caso de abajo: una llave *sin contestar* habilita; una llave *que no se preguntó*,
    // no. Es lo que hace que las cadenas de saltos no se salten un eslabón.
    if (!decide(llave, conEsta)) return false

    const contestado = (valores[llave.id] ?? '').trim()
    if (contestado === '') return true

    switch (p.operadorDependencia ?? 'IGUAL') {
      case 'DISTINTO':
        return contestado !== esperado
      case 'EN':
        return esperado.split('|').some((v) => v.trim() === contestado)
      default:
        return contestado === esperado
    }
  }

  const habilitadas = new Set<number>()
  for (const p of preguntas) {
    if (decide(p, new Set())) habilitadas.add(p.id)
  }
  return habilitadas
}

/**
 * Qué renglones de una tabla se pintan, y cuáles no aparecen.
 *
 * ## Apagar no es lo mismo que esconder
 *
 * Un renglón donde queda algo por contestar se pinta entero, y las celdas que su
 * pregunta llave dejó fuera se ven **apagadas**: sacarlas dejaría un hueco en medio
 * del renglón y quien contesta pierde de vista la tabla que tiene en el papel. Es el
 * caso de la 57: marcar «Yo no compré este producto» apaga los ocho lugares de ese
 * renglón, que quedan tachados a la vista.
 *
 * Un renglón donde **no queda nada** por contestar no se pinta. Y esto hace falta: en
 * las tablas de la 183 y la 203 cada renglón entero depende de «¿le ocurrió esta
 * situación?», así que a quien contestó que no le ocurrió ninguna se le pintarían
 * treinta y cinco o cuarenta y cinco controles muertos. Eso no se lee como una tabla
 * tachada; se lee como una tabla que dejó de funcionar.
 *
 * @param celdas      las celdas de la tabla, con el renglón que ocupa cada una
 * @param habilitadas lo que sí se le pregunta, de {@link calcularHabilitadas}
 * @returns los renglones que tienen al menos una celda por contestar
 */
export function renglonesConAlgoQueContestar(
  celdas: Array<{ id: number; fila: string }>,
  habilitadas: Set<number>,
): Set<string> {
  const vivos = new Set<string>()
  for (const c of celdas) {
    if (habilitadas.has(c.id)) vivos.add(c.fila)
  }
  return vivos
}

/**
 * Las casillas de descarte que **todavía no se pueden marcar**, porque ya hay
 * contestado algo de lo que ellas descartan.
 *
 * ## Qué problema resuelve
 *
 * «Yo no compré este producto» apaga los ocho lugares de su renglón, y eso lo hace
 * la dependencia. Pero al revés no: nada impedía marcar primero una gasolinera y
 * después «no lo compré», y el renglón quedaba diciendo las dos cosas.
 *
 * De las dos formas de cerrar el candado, esta no borra nada: mientras haya lugares
 * marcados, el descarte se ve apagado, y para cambiar de opinión se desmarcan los
 * lugares. Borrarle al participante respuestas que ya dio, sin preguntarle, es peor
 * que el problema.
 *
 * ## Por qué va aparte de {@link calcularHabilitadas}
 *
 * Porque no es lo mismo. Una pregunta deshabilitada **no se le hizo**: no se guarda y
 * no cuenta para el avance. Un descarte bloqueado sí es una pregunta suya, solo que
 * en este momento no la puede marcar. Mezclarlos haría que el formulario del personal
 * dejara de guardarlo.
 *
 * ## Y por qué solo cuando está sin marcar
 *
 * Un cuestionario escaneado puede traer el renglón contradiciéndose: el descarte
 * marcado y además un lugar. Si el bloqueo valiera también entonces, el renglón
 * entero quedaría inerte y nadie podría arreglarlo. Estando marcado se deja tocar,
 * se desmarca, y los lugares vuelven. La contradicción, además, ya la señala la regla
 * EXCLUYE.
 *
 * @returns los ids de los descartes que no se pueden marcar ahora
 */
export function calcularBloqueadas<P extends PreguntaConLlave>(
  preguntas: P[],
  valores: Record<number, string>,
): Set<number> {
  const porCodigo = new Map<string, P>()
  for (const p of preguntas) porCodigo.set(p.codigo, p)

  const bloqueadas = new Set<number>()
  for (const p of preguntas) {
    if ((p.operadorDependencia ?? 'IGUAL') !== 'DISTINTO') continue
    const descarte = porCodigo.get(p.dependeDe?.trim() ?? '')
    if (!descarte) continue
    if ((valores[descarte.id] ?? '').trim() !== '') continue
    if ((valores[p.id] ?? '').trim() !== '') bloqueadas.add(descarte.id)
  }
  return bloqueadas
}
