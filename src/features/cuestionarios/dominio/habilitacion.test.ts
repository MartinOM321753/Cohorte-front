import { describe, expect, it } from 'vitest'

import {
  calcularBloqueadas, calcularHabilitadas, renglonesConAlgoQueContestar,
  type PreguntaConLlave,
} from './habilitacion'

/**
 * Las mismas comprobaciones que `EtiquetaCuestionarioTest.Dependencias` le hace al
 * evaluador de Java, con los mismos nombres.
 *
 * Esa duplicación es a propósito: la regla está escrita dos veces —en el servidor,
 * que manda al guardar y al importar, y aquí, para que la pantalla reaccione sin
 * guardar— y lo único que mantiene las dos versiones de acuerdo es que respondan igual
 * a la misma lista de casos. Si alguien cambia una de las dos, estas pruebas o las de
 * Java tienen que empezar a fallar.
 *
 * Al final van los dos casos que solo existen en el cliente: qué pasa con una llave
 * que no viene en el bloque cargado.
 */

let siguiente = 1

/** Una pregunta sin condición. */
function suelta(codigo: string): PreguntaConLlave {
  return { id: siguiente++, codigo }
}

function dependiente(
  codigo: string,
  llave: string,
  valor: string | null,
  operador?: 'IGUAL' | 'DISTINTO' | 'EN',
): PreguntaConLlave {
  return {
    id: siguiente++,
    codigo,
    dependeDe: llave,
    valorHabilitante: valor,
    operadorDependencia: operador,
  }
}

/**
 * @param respuestas lo contestado, por código de pregunta
 * @returns si a `preguntas[0]` le toca contestarse
 */
function seLePregunta(
  preguntas: PreguntaConLlave[],
  respuestas: Record<string, string>,
  delServidor: number[] = [],
): boolean {
  const valores: Record<number, string> = {}
  for (const p of preguntas) valores[p.id] = respuestas[p.codigo] ?? ''
  return calcularHabilitadas(preguntas, valores, delServidor).has(preguntas[0].id)
}

describe('Si la pregunta se le hace al participante', () => {
  it('sin llave, siempre se pregunta', () => {
    expect(seLePregunta([suelta('P19')], {})).toBe(true)
  })

  it('con la llave contestada como se espera, se pregunta', () => {
    const llave = suelta('P19')
    expect(seLePregunta([dependiente('P20', 'P19', '1'), llave], { P19: '1' })).toBe(true)
  })

  it('con la llave contestada de otra forma, no se pregunta', () => {
    const llave = suelta('P19')
    expect(seLePregunta([dependiente('P20', 'P19', '1'), llave], { P19: '2' })).toBe(false)
  })

  it('si la llave no esta contestada, se pregunta igual', () => {
    // Es el lado seguro: una pregunta de más que se muestra se deja en blanco; una que
    // se escondió sin motivo deja un hueco que nadie detecta.
    const llave = suelta('P19')
    expect(seLePregunta([dependiente('P20', 'P19', '1'), llave], { P19: '' })).toBe(true)
    expect(seLePregunta([dependiente('P20', 'P19', '1'), llave], {})).toBe(true)
  })

  it('depender de algo sin decir de que valor no deshabilita', () => {
    const llave = suelta('P19')
    expect(seLePregunta([dependiente('P20', 'P19', null), llave], { P19: '9' })).toBe(true)
    expect(seLePregunta([dependiente('P20', 'P19', '  '), llave], { P19: '9' })).toBe(true)
  })

  describe('la casilla de descarte (DISTINTO)', () => {
    it('con la llave marcada, la dependiente NO se pregunta', () => {
      const llave = suelta('P112_1')
      expect(seLePregunta(
        [dependiente('P112_2', 'P112_1', '1', 'DISTINTO'), llave], { P112_1: '1' },
      )).toBe(false)
    })

    it('con la llave contestada de otra forma, si se pregunta', () => {
      const llave = suelta('P112_1')
      expect(seLePregunta(
        [dependiente('P112_2', 'P112_1', '1', 'DISTINTO'), llave], { P112_1: '2' },
      )).toBe(true)
    })

    it('la llave sin contestar sigue habilitando, tambien al reves', () => {
      const llave = suelta('P112_1')
      expect(seLePregunta(
        [dependiente('P112_2', 'P112_1', '1', 'DISTINTO'), llave], { P112_1: '' },
      )).toBe(true)
      expect(seLePregunta(
        [dependiente('P112_2', 'P112_1', '1', 'DISTINTO'), llave], {},
      )).toBe(true)
    })

    /**
     * El caso de la P57, que es para lo que se puso todo esto: una casilla sin marcar
     * vale `''` igual que una pregunta sin contestar, así que los ocho lugares de
     * compra se preguntan; en cuanto se marca «Yo no compré este producto», no.
     */
    it('una casilla sirve de llave en sus dos estados', () => {
      const noCompro = suelta('P57_01')
      const lugares = [2, 3, 4].map((n) =>
        dependiente(`P57_0${n}`, 'P57_01', '1', 'DISTINTO'))
      const preguntas = [...lugares, noCompro]

      const valores: Record<number, string> = {}
      for (const p of preguntas) valores[p.id] = ''
      expect(calcularHabilitadas(preguntas, valores, []).size).toBe(4)

      valores[noCompro.id] = '1'
      const conNegacion = calcularHabilitadas(preguntas, valores, [])
      expect(conNegacion.has(noCompro.id)).toBe(true)
      for (const l of lugares) expect(conNegacion.has(l.id)).toBe(false)
    })
  })

  describe('EN, para la pregunta con dos saltos', () => {
    it('sin decir el operador se compara por igualdad, como siempre', () => {
      const llave = suelta('P30')
      expect(seLePregunta([dependiente('P31', 'P30', '2'), llave], { P30: '2' })).toBe(true)
      expect(seLePregunta([dependiente('P31', 'P30', '2'), llave], { P30: '3' })).toBe(false)
    })

    it('EN acepta cualquiera de los valores de la lista', () => {
      const llave = suelta('P30')
      expect(seLePregunta(
        [dependiente('P42', 'P30', '2|3', 'EN'), llave], { P30: '2' })).toBe(true)
      expect(seLePregunta(
        [dependiente('P42', 'P30', '2|3', 'EN'), llave], { P30: '3' })).toBe(true)
    })

    it('EN rechaza lo que no esta en la lista', () => {
      const llave = suelta('P30')
      expect(seLePregunta(
        [dependiente('P42', 'P30', '2|3', 'EN'), llave], { P30: '1' })).toBe(false)
    })

    it('EN compara el valor entero, no por parecido', () => {
      const llave = suelta('P30')
      expect(seLePregunta(
        [dependiente('P42', 'P30', '1|2', 'EN'), llave], { P30: '12' })).toBe(false)
    })

    it('con la llave sin contestar, EN tambien pregunta', () => {
      const llave = suelta('P30')
      expect(seLePregunta([dependiente('P42', 'P30', '2|3', 'EN'), llave], {})).toBe(true)
    })
  })

  describe('las cadenas de saltos', () => {
    /** La 34 depende de la 33, que depende de la 30. */
    function cadena() {
      const p30 = suelta('P30')
      const p33 = dependiente('P33', 'P30', '1')
      const p34: PreguntaConLlave = {
        id: siguiente++, codigo: 'P34', dependeDe: 'P33', valorHabilitante: '1',
      }
      return { p30, p33, p34, todas: [p34, p33, p30] }
    }

    it('si a la llave no se le pregunto, a la dependiente tampoco', () => {
      // Quien nunca fumó no contestó la 33. Mirando solo la llave inmediata, la 33
      // está vacía —«no sabemos»— y la 34 se preguntaría a quien ya dijo que no fuma.
      const { todas } = cadena()
      expect(seLePregunta(todas, { P30: '2' })).toBe(false)
    })

    it('si la llave si se pregunto, manda su propia respuesta', () => {
      const { todas } = cadena()
      expect(seLePregunta(todas, { P30: '1', P33: '1' })).toBe(true)
      expect(seLePregunta(todas, { P30: '1', P33: '2' })).toBe(false)
      expect(seLePregunta(todas, { P30: '1' })).toBe(true)
    })

    it('un anillo de llaves no esconde preguntas', () => {
      const a: PreguntaConLlave = {
        id: siguiente++, codigo: 'A', dependeDe: 'B', valorHabilitante: '1',
      }
      const b: PreguntaConLlave = {
        id: siguiente++, codigo: 'B', dependeDe: 'A', valorHabilitante: '1',
      }
      // Contestadas con el valor que habilita, las dos se muestran: el recorrido se
      // corta en vez de colgarse. Contestadas de otra forma sí desaparecen, y queda
      // escrito aquí y en Java porque es el caso donde dos implementaciones de la misma
      // regla se separarían sin que nada falle.
      expect(seLePregunta([a, b], { A: '1', B: '1' })).toBe(true)
      expect(seLePregunta([b, a], { A: '1', B: '1' })).toBe(true)
      expect(seLePregunta([a, b], { A: '2', B: '2' })).toBe(false)
    })
  })

  describe('el candado al reves: marcar el descarte cuando ya hay algo marcado', () => {
    /** Un renglón de la 57: el descarte y dos de sus ocho lugares. */
    function renglon() {
      const noCompro = suelta('P57_01')
      const gasolinera = dependiente('P57_07', 'P57_01', '1', 'DISTINTO')
      const abarrotes = dependiente('P57_13', 'P57_01', '1', 'DISTINTO')
      return { noCompro, gasolinera, abarrotes, todas: [noCompro, gasolinera, abarrotes] }
    }

    function conValores(
      preguntas: PreguntaConLlave[], respuestas: Record<string, string>,
    ): Record<number, string> {
      const valores: Record<number, string> = {}
      for (const p of preguntas) valores[p.id] = respuestas[p.codigo] ?? ''
      return valores
    }

    it('con el renglon vacio se puede marcar el descarte', () => {
      const { noCompro, todas } = renglon()
      expect(calcularBloqueadas(todas, conValores(todas, {})).has(noCompro.id)).toBe(false)
    })

    it('con un lugar marcado, el descarte se bloquea', () => {
      const { noCompro, todas } = renglon()
      const bloqueadas = calcularBloqueadas(todas, conValores(todas, { P57_07: '1' }))
      expect(bloqueadas.has(noCompro.id)).toBe(true)
    })

    it('el descarte ya marcado NO se bloquea, para poder desmarcarlo', () => {
      // Un cuestionario escaneado puede traer el renglón contradiciéndose. Si se
      // bloqueara también entonces, el renglón entero quedaría inerte y nadie podría
      // arreglarlo.
      const { noCompro, todas } = renglon()
      const bloqueadas = calcularBloqueadas(
        todas, conValores(todas, { P57_01: '1', P57_07: '1' }))
      expect(bloqueadas.has(noCompro.id)).toBe(false)
    })

    it('un lugar de otro renglon no bloquea este descarte', () => {
      const { noCompro, todas } = renglon()
      const otro = dependiente('P57_08', 'P57_02', '1', 'DISTINTO')
      const bloqueadas = calcularBloqueadas(
        [...todas, otro], conValores([...todas, otro], { P57_08: '1' }))
      expect(bloqueadas.has(noCompro.id)).toBe(false)
    })

    it('bloquear no es deshabilitar: el descarte sigue siendo una pregunta suya', () => {
      // Si se mezclaran, el formulario del personal dejaria de guardarlo.
      const { noCompro, todas } = renglon()
      const valores = conValores(todas, { P57_07: '1' })
      expect(calcularHabilitadas(todas, valores, []).has(noCompro.id)).toBe(true)
    })
  })

  describe('que renglones de la tabla se pintan', () => {
    /** Un renglón de la 57: el descarte y dos lugares, los tres de la misma fila. */
    const cigarros = [
      { id: 1, fila: 'Cigarros' },
      { id: 2, fila: 'Cigarros' },
      { id: 3, fila: 'Cigarros' },
    ]

    it('con algo por contestar, el renglon se pinta', () => {
      // «Yo no compré» marcado: los dos lugares quedan fuera, pero el descarte sigue
      // vivo. El renglón se pinta, con los dos lugares tachados a la vista.
      const vivos = renglonesConAlgoQueContestar(cigarros, new Set([1]))
      expect(vivos.has('Cigarros')).toBe(true)
    })

    it('sin nada por contestar, el renglon no se pinta', () => {
      // Es el caso de la 183 y la 203: el renglón entero depende de «¿le ocurrió esta
      // situación?». Pintado en gris completo parece que la tabla dejó de funcionar.
      const vivos = renglonesConAlgoQueContestar(cigarros, new Set())
      expect(vivos.has('Cigarros')).toBe(false)
      expect(vivos.size).toBe(0)
    })

    it('un renglon no decide por los demas', () => {
      const dos = [...cigarros, { id: 4, fila: 'Puros' }, { id: 5, fila: 'Puros' }]
      const vivos = renglonesConAlgoQueContestar(dos, new Set([4]))
      expect([...vivos]).toEqual(['Puros'])
    })
  })

  describe('lo que solo pasa en la pantalla', () => {
    it('si la llave esta en otro bloque, manda el servidor', () => {
      // «P9» no viene entre las preguntas del bloque cargado: no hay forma de saber qué
      // vale, y el servidor ya lo resolvió con lo que hay guardado.
      const dentro = dependiente('P20', 'P9', '1')
      expect(seLePregunta([dentro], {}, [dentro.id])).toBe(true)
      expect(seLePregunta([dentro], {}, [])).toBe(false)
    })

    it('si la llave esta en el bloque, el veredicto del servidor se ignora', () => {
      // Aquí está el defecto que esto arregla: el servidor dijo «no se pregunta» con lo
      // que había guardado, y el participante acaba de contestar la llave. Lo que vale
      // es la pantalla.
      const llave = suelta('P19')
      const dependiente1 = dependiente('P20', 'P19', '1')
      expect(seLePregunta([dependiente1, llave], { P19: '1' }, [])).toBe(true)
      expect(seLePregunta([dependiente1, llave], { P19: '2' }, [dependiente1.id])).toBe(false)
    })
  })
})
