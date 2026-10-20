import { useCallback, useEffect, useRef, useState } from 'react'

import { autoguardarRespuestas } from '../api/misCuestionarios.api'
import type { AvisoDeRegla } from '../api/misCuestionarios.api'

/**
 * Autoguardado a prueba de perder la conexión.
 *
 * <h3>Lo primero es el disco, no la red</h3>
 *
 * Cada cambio se escribe en `localStorage` **antes** de intentar enviarlo. Ese orden es
 * todo el asunto: si se enviara primero y se guardara al confirmar, una caída de red —o
 * cerrar la pestaña, o que se apague el teléfono— perdería lo tecleado desde el último
 * envío con éxito. Guardando primero, lo peor que pasa es que el cambio espere en la cola;
 * sobrevive a recargar la página y al modo avión.
 *
 * <h3>Por qué cada cambio lleva un contador</h3>
 *
 * El envío reintenta y los paquetes llegan en el orden que quieren. Sin un contador, esto
 * ocurre: el participante escribe «5», lo borra, el borrado sale primero y el «5» aterriza
 * después — y el 5 reaparece solo. Con el contador, el servidor descarta todo cambio que
 * no supere al que ya tiene guardado, así que reenviar es inofensivo y el orden de llegada
 * deja de importar.
 *
 * El contador **se inicializa con el mayor que venga del servidor**. Si empezara en cero,
 * un participante que retoma el cuestionario en otro dispositivo vería todos sus cambios
 * rechazados por venir «atrasados».
 *
 * <h3>Lo que este mecanismo no puede hacer</h3>
 *
 * La cola vive en el navegador de ese dispositivo. Si pierde la conexión y cambia de
 * teléfono antes de recuperarla, lo que quedó pendiente no viaja con él. Es inherente a
 * guardar en el cliente y por eso la pantalla dice en qué estado está en lugar de dar a
 * entender que todo está a salvo en el servidor.
 */

/** Un cambio esperando a ser enviado. */
interface Pendiente {
  valor: string
  secuencia: number
}

export type EstadoGuardado =
  | { tipo: 'limpio'; guardadoEn: Date | null }
  | { tipo: 'pendiente'; cuantos: number }
  | { tipo: 'guardando'; cuantos: number }
  | { tipo: 'sin-conexion'; cuantos: number }
  | { tipo: 'error'; cuantos: number; mensaje: string }

/** Cuánto se espera tras dejar de teclear antes de enviar. */
const RETARDO_MS = 1200

/** Reintento con espera creciente, con tope para no castigar una reconexión tardía. */
const ESPERA_MINIMA_MS = 1000
const ESPERA_MAXIMA_MS = 30_000

const PREFIJO = 'cohorte.cuestionario'

function llaveCola(idCuestionario: number) {
  return `${PREFIJO}.${idCuestionario}.pendientes`
}

function llaveContador(idCuestionario: number) {
  return `${PREFIJO}.${idCuestionario}.secuencia`
}

/**
 * Toda lectura y escritura va envuelta: en una ventana privada, con el almacenamiento
 * bloqueado o con la cuota llena, el acceso lanza. El formulario tiene que seguir
 * funcionando —enviando en directo— aunque no haya dónde guardar la cola.
 */
function leerCola(idCuestionario: number): Record<string, Pendiente> {
  try {
    const crudo = localStorage.getItem(llaveCola(idCuestionario))
    return crudo ? (JSON.parse(crudo) as Record<string, Pendiente>) : {}
  } catch {
    return {}
  }
}

function escribirCola(idCuestionario: number, cola: Record<string, Pendiente>) {
  try {
    if (Object.keys(cola).length === 0) localStorage.removeItem(llaveCola(idCuestionario))
    else localStorage.setItem(llaveCola(idCuestionario), JSON.stringify(cola))
  } catch {
    // Sin almacenamiento la cola solo vive en memoria. Se sigue enviando igual.
  }
}

function leerContador(idCuestionario: number): number {
  try {
    const crudo = localStorage.getItem(llaveContador(idCuestionario))
    const n = crudo ? Number(crudo) : 0
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function escribirContador(idCuestionario: number, valor: number) {
  try {
    localStorage.setItem(llaveContador(idCuestionario), String(valor))
  } catch {
    // ignorado a proposito; ver leerCola
  }
}

export function useAutoguardado(idCuestionario: number | null) {
  const [estado, setEstado] = useState<EstadoGuardado>({ tipo: 'limpio', guardadoEn: null })
  const [invalidos, setInvalidos] = useState<Record<number, string>>({})

  /**
   * Lo que el servidor advierte de lo que lleva contestado.
   *
   * Se reemplazan enteros en cada respuesta del servidor, no se acumulan: un aviso
   * que ya se corrigio tiene que desaparecer solo. Guardarlos sumando dejaria al
   * participante mirando una advertencia que ya resolvio, y eso ensena a ignorarlas.
   */
  const [avisos, setAvisos] = useState<AvisoDeRegla[]>([])

  // La cola y el contador viven en refs y no en estado: cambian en cada pulsación y
  // volver a renderizar el formulario entero por cada tecla lo haría inservible con dos
  // mil campos. El estado visible se actualiza aparte, y es poca cosa.
  const cola = useRef<Record<string, Pendiente>>({})
  const contador = useRef(0)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enVuelo = useRef(false)
  const espera = useRef(ESPERA_MINIMA_MS)
  const ultimoGuardado = useRef<Date | null>(null)

  // Al cambiar de cuestionario se recupera lo que quedo pendiente de la vez anterior.
  useEffect(() => {
    if (idCuestionario == null) return
    cola.current = leerCola(idCuestionario)
    contador.current = leerContador(idCuestionario)
    const cuantos = Object.keys(cola.current).length
    setEstado(cuantos > 0 ? { tipo: 'pendiente', cuantos } : { tipo: 'limpio', guardadoEn: null })
  }, [idCuestionario])

  const refrescarEstado = useCallback(() => {
    const cuantos = Object.keys(cola.current).length
    if (cuantos === 0) {
      setEstado({ tipo: 'limpio', guardadoEn: ultimoGuardado.current })
      return
    }
    if (!navigator.onLine) setEstado({ tipo: 'sin-conexion', cuantos })
    else if (enVuelo.current) setEstado({ tipo: 'guardando', cuantos })
    else setEstado({ tipo: 'pendiente', cuantos })
  }, [])

  const enviar = useCallback(async () => {
    if (idCuestionario == null) return
    if (enVuelo.current) return
    const llaves = Object.keys(cola.current)
    if (llaves.length === 0) return

    if (!navigator.onLine) {
      // No se intenta: el navegador ya sabe que no hay red. El evento `online` lo
      // reintentara, y mientras la pantalla lo dice en lugar de fingir que guarda.
      refrescarEstado()
      return
    }

    // Se envia una copia. Lo que el participante teclee mientras el envio esta en vuelo
    // se queda en la cola y se manda en la siguiente ronda; sin la copia, confirmar el
    // envio borraria tambien esos cambios nuevos, que nunca llegaron a salir.
    const lote = llaves.map((id) => ({
      idVariable: Number(id),
      valor: cola.current[id].valor,
      secuencia: cola.current[id].secuencia,
    }))

    enVuelo.current = true
    refrescarEstado()

    try {
      const r = await autoguardarRespuestas(idCuestionario, lote)

      // Se saca de la cola lo confirmado, pero solo si no cambio mientras volaba.
      for (const enviado of lote) {
        const actual = cola.current[String(enviado.idVariable)]
        if (!actual || actual.secuencia !== enviado.secuencia) continue

        const aceptado = r.aceptados[enviado.idVariable] != null
        // «Rechazado» no es un fallo: el servidor ya tenia algo mas nuevo de esa
        // respuesta. Mantenerlo en la cola lo reenviaria para siempre.
        const yaSuperado = r.rechazados.includes(enviado.idVariable)
        const invalido = r.invalidos[enviado.idVariable] != null

        if (aceptado || yaSuperado || invalido) {
          delete cola.current[String(enviado.idVariable)]
        }
      }
      escribirCola(idCuestionario, cola.current)

      // Solo se tocan los avisos de los bloques que el servidor acaba de revisar.
      // Como el autoguardado manda lo que cambio de UN bloque, lo que devuelve es de
      // ese bloque: lo de los demas se conserva.
      setAvisos(r.avisos ?? [])

      const malos = Object.entries(r.invalidos)
      if (malos.length > 0) {
        setInvalidos((previos) => {
          const nuevos = { ...previos }
          for (const [id, motivo] of malos) nuevos[Number(id)] = motivo
          return nuevos
        })
      }

      espera.current = ESPERA_MINIMA_MS
      ultimoGuardado.current = new Date()
      enVuelo.current = false

      if (Object.keys(cola.current).length > 0) {
        // Quedaron cambios nuevos: se mandan en seguida, sin esperar otra pulsacion.
        temporizador.current = setTimeout(() => void enviar(), 0)
      }
      refrescarEstado()
    } catch (e) {
      enVuelo.current = false
      const cuantos = Object.keys(cola.current).length

      if (!navigator.onLine) {
        setEstado({ tipo: 'sin-conexion', cuantos })
      } else {
        setEstado({
          tipo: 'error',
          cuantos,
          mensaje: 'No se pudo guardar. Se reintentara solo; sus respuestas estan a salvo en este dispositivo.',
        })
      }

      // Espera creciente para no insistir contra un servidor caido, con tope para que
      // una reconexion no tarde medio minuto en notarse.
      const esperaActual = espera.current
      espera.current = Math.min(espera.current * 2, ESPERA_MAXIMA_MS)
      temporizador.current = setTimeout(() => void enviar(), esperaActual)
    }
  }, [idCuestionario, refrescarEstado])

  /**
   * Registra un cambio. Devuelve en cuanto está guardado en el dispositivo; el envío
   * ocurre después.
   */
  const registrar = useCallback((idVariable: number, valor: string) => {
    if (idCuestionario == null) return

    contador.current += 1
    cola.current[String(idVariable)] = { valor, secuencia: contador.current }
    escribirCola(idCuestionario, cola.current)
    escribirContador(idCuestionario, contador.current)

    setInvalidos((previos) => {
      if (previos[idVariable] == null) return previos
      const nuevos = { ...previos }
      delete nuevos[idVariable]
      return nuevos
    })

    refrescarEstado()

    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => void enviar(), RETARDO_MS)
  }, [idCuestionario, enviar, refrescarEstado])

  /**
   * Sube el contador por encima de lo que el servidor ya tiene guardado.
   *
   * El formulario lo llama al cargar cada bloque. Sin esto, retomar el cuestionario en
   * otro dispositivo —donde el contador local empieza en cero— haria que el servidor
   * rechazara todos los cambios por venir atrasados.
   */
  const sincronizarSecuencia = useCallback((secuencias: Array<number | null>) => {
    if (idCuestionario == null) return
    const mayor = secuencias.reduce<number>((max, s) => (s != null && s > max ? s : max), 0)
    if (mayor > contador.current) {
      contador.current = mayor
      escribirContador(idCuestionario, mayor)
    }
  }, [idCuestionario])

  /** Fuerza el envío ahora. Se usa antes de enviar el cuestionario o de cambiar de bloque. */
  const guardarYa = useCallback(async () => {
    if (temporizador.current) clearTimeout(temporizador.current)
    await enviar()
  }, [enviar])

  /** Lo que está en la cola de este momento, por si el formulario necesita pintarlo. */
  const pendientes = useCallback(
    () => Object.keys(cola.current).map(Number),
    [],
  )

  // Reintento inmediato al volver la conexion, y aviso al perderla.
  useEffect(() => {
    function alConectar() { void enviar() }
    function alDesconectar() { refrescarEstado() }
    window.addEventListener('online', alConectar)
    window.addEventListener('offline', alDesconectar)
    return () => {
      window.removeEventListener('online', alConectar)
      window.removeEventListener('offline', alDesconectar)
    }
  }, [enviar, refrescarEstado])

  // Si quedan cambios sin enviar, se avisa antes de cerrar. No se pierden —estan en el
  // dispositivo— pero el participante tiene que poder decidir esperar unos segundos.
  useEffect(() => {
    function alCerrar(e: BeforeUnloadEvent) {
      if (Object.keys(cola.current).length > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', alCerrar)
    return () => window.removeEventListener('beforeunload', alCerrar)
  }, [])

  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current) }, [])

  return { estado, invalidos, avisos, registrar, guardarYa, sincronizarSecuencia,
    pendientes }
}
