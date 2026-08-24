import { formatDate } from '@/lib/utils'
import { InfoPanel, type CampoInfo } from './InfoPanel'
import type {
  Ubicacion3DCaja,
  Ubicacion3DMuestra,
  Ubicacion3DPiso,
  Ubicacion3DRefrigerador,
} from './ubicacion3d.types'

// Paneles laterales de las cuatro vistas, compartidos por los dos modos de uso:
// seguir una muestra concreta y recorrer el biobanco sin objetivo. En ambos
// casos describen *lo que está seleccionado*, que es lo que el usuario acaba de
// tocar en la escena.

export function PanelRefrigerador({
  refrigerador,
  pisoSeleccionado,
}: {
  refrigerador: Ubicacion3DRefrigerador
  pisoSeleccionado: number | null
}) {
  const activo = pisoSeleccionado ?? refrigerador.idPisoDestino
  const piso = refrigerador.pisos.find((p) => p.id === activo) ?? null
  return (
    <InfoPanel
      titulo={refrigerador.nombre || refrigerador.codigo}
      subtitulo={refrigerador.nombre ? refrigerador.codigo : undefined}
      ocupacion={{
        etiqueta: 'Huecos ocupados',
        ocupadas: refrigerador.posicionesOcupadas,
        total: refrigerador.totalPosiciones,
        porcentaje: refrigerador.porcentajeOcupacion,
      }}
      campos={[
        { label: 'Marca', value: refrigerador.marca },
        { label: 'Modelo', value: refrigerador.modelo },
        { label: 'Estado del registro', value: refrigerador.activo ? 'Activo' : 'Inactivo' },
        { label: 'Sede', value: refrigerador.nombreInstitucion },
        { label: 'Pisos', value: refrigerador.totalPisos },
        {
          label: 'Piso de la muestra',
          value: refrigerador.pisos.find((p) => p.esDestino)?.numeroPiso,
        },
      ]}
      seleccion={
        piso
          ? {
              titulo: `Piso ${piso.numeroPiso}`,
              pie:
                pisoSeleccionado != null
                  ? 'Vuelve a tocarlo en la escena para entrar'
                  : undefined,
              ocupacion: {
                etiqueta: 'Huecos ocupados',
                ocupadas: piso.posicionesOcupadas,
                total: piso.totalPosiciones,
                porcentaje: piso.porcentajeOcupacion,
              },
              campos: [
                { label: 'Rejilla', value: `${piso.filas} × ${piso.columnas} × ${piso.altura}` },
                { label: 'Cajas', value: piso.totalCajas },
                { label: 'Huecos libres', value: piso.posicionesLibres },
              ],
            }
          : undefined
      }
      vacio={piso ? undefined : 'Toca un piso para ver su detalle.'}
    />
  )
}

export function PanelPiso({
  piso,
  huecoSeleccionado,
}: {
  piso: Ubicacion3DPiso
  huecoSeleccionado: number | null
}) {
  const hueco =
    piso.cajas.find((c) => c.idPosicionPiso === huecoSeleccionado) ??
    piso.cajas.find((c) => c.esDestino) ??
    null
  return (
    <InfoPanel
      titulo={`Piso ${piso.numeroPiso}`}
      subtitulo={piso.codigoRefrigerador ?? undefined}
      ocupacion={{
        etiqueta: 'Huecos ocupados',
        ocupadas: piso.posicionesOcupadas,
        total: piso.totalPosiciones,
        porcentaje: piso.porcentajeOcupacion,
      }}
      campos={[
        { label: 'Rejilla', value: `${piso.filas} × ${piso.columnas} × ${piso.altura} alturas` },
        { label: 'Cajas colocadas', value: piso.totalCajas },
        { label: 'Huecos libres', value: piso.posicionesLibres },
      ]}
      seleccion={
        hueco
          ? {
              titulo: hueco.codigoCaja ?? `Hueco ${hueco.fila}${hueco.columna}`,
              pie:
                hueco.idCaja != null && huecoSeleccionado != null
                  ? 'Vuelve a tocarla en la escena para entrar'
                  : undefined,
              ocupacion:
                hueco.capacidad != null
                  ? {
                      etiqueta: 'Posiciones ocupadas',
                      ocupadas: hueco.ocupadas ?? 0,
                      total: hueco.capacidad,
                      porcentaje: hueco.capacidad
                        ? Math.round(((hueco.ocupadas ?? 0) / hueco.capacidad) * 100)
                        : 0,
                    }
                  : undefined,
              campos: [
                {
                  label: 'Coordenada',
                  value: `${hueco.fila}${hueco.columna} · altura ${hueco.altura}`,
                },
                { label: 'Tipo de caja', value: hueco.tipoCaja },
                { label: 'Color', value: hueco.color },
                { label: 'Estado', value: hueco.idCaja == null ? 'Hueco libre' : null },
              ],
            }
          : undefined
      }
      vacio={hueco ? undefined : 'Toca una caja para ver su detalle.'}
    />
  )
}

export function PanelCaja({
  caja,
  posicionSeleccionada,
}: {
  caja: Ubicacion3DCaja
  posicionSeleccionada: number | null
}) {
  const posicion =
    caja.posiciones.find((p) => p.id === posicionSeleccionada) ??
    caja.posiciones.find((p) => p.esDestino) ??
    null
  return (
    <InfoPanel
      titulo={caja.codigoCaja}
      subtitulo={
        [caja.codigoRefrigerador, caja.numeroPiso ? `Piso ${caja.numeroPiso}` : null]
          .filter(Boolean)
          .join(' · ') || undefined
      }
      ocupacion={{
        etiqueta: 'Posiciones ocupadas',
        ocupadas: caja.ocupadas,
        total: caja.capacidad,
        porcentaje: caja.porcentajeOcupacion,
      }}
      campos={[
        { label: 'Rejilla', value: `${caja.filas} × ${caja.columnas}` },
        { label: 'Tipo de caja', value: caja.tipoCaja },
        { label: 'Color', value: caja.color },
        { label: 'Posiciones libres', value: caja.libres },
        { label: 'Coordenada en el piso', value: caja.coordenadaEnPiso },
        { label: 'Observaciones', value: caja.observaciones },
      ]}
      seleccion={
        posicion
          ? {
              titulo: `F${posicion.fila} · C${posicion.columna}`,
              pie: posicionSeleccionada != null ? 'Vuelve a tocarla para acercarte' : undefined,
              campos: [
                { label: 'Estado', value: posicion.ocupada ? 'Ocupada' : 'Libre' },
                { label: 'Muestra', value: posicion.etiquetaMuestra },
              ],
            }
          : undefined
      }
      vacio={posicion ? undefined : 'Toca una posición para ver qué contiene.'}
    />
  )
}

export function PanelPosicion({
  caja,
  fila,
  columna,
  muestra,
  cargandoMuestra,
}: {
  caja: Ubicacion3DCaja
  fila: number
  columna: number
  /** Ficha completa, cuando se ha podido resolver la muestra alojada. */
  muestra?: Ubicacion3DMuestra | null
  cargandoMuestra?: boolean
}) {
  const posicion = caja.posiciones.find((p) => p.fila === fila && p.columna === columna) ?? null
  const subtitulo =
    [caja.codigoRefrigerador, caja.numeroPiso ? `Piso ${caja.numeroPiso}` : null, caja.codigoCaja]
      .filter(Boolean)
      .join(' · ') || caja.codigoCaja

  if (muestra) {
    return (
      <InfoPanel titulo={`F${fila} · C${columna}`} subtitulo={subtitulo} campos={camposDeMuestra(muestra)} />
    )
  }
  return (
    <InfoPanel
      titulo={`F${fila} · C${columna}`}
      subtitulo={subtitulo}
      campos={[
        { label: 'Estado', value: posicion?.ocupada ? 'Ocupada' : 'Libre' },
        { label: 'Muestra', value: posicion?.etiquetaMuestra },
      ]}
      vacio={cargandoMuestra ? 'Cargando la ficha de la muestra…' : undefined}
    />
  )
}

/** Ficha de una muestra. Solo campos que la entidad guarda de verdad. */
export function camposDeMuestra(m: Ubicacion3DMuestra): CampoInfo[] {
  return [
    { label: 'Muestra', value: m.etiqueta },
    { label: 'Tipo', value: m.tipoMuestra },
    { label: 'Contenedor', value: m.tuboMuestra },
    { label: 'Volumen', value: m.valor != null ? `${m.valor} ${m.unidad ?? ''}`.trim() : null },
    { label: 'Temperatura de resguardo', value: m.temperaturaAlmacenamiento },
    {
      label: 'Alícuota',
      value:
        m.numeroAlicuota != null && m.totalAlicuotas != null
          ? `${m.numeroAlicuota} de ${m.totalAlicuotas}`
          : null,
    },
    { label: 'Deriva de', value: m.etiquetaMuestraPadre },
    {
      label: 'Participante',
      value:
        m.pacienteFolio || m.pacienteNombre
          ? [m.pacienteFolio, m.pacienteNombre].filter(Boolean).join(' — ')
          : null,
    },
    { label: 'Recolectó', value: m.usuarioRecolecta },
    { label: 'Recolección', value: m.fechaRecoleccion ? formatDate(m.fechaRecoleccion) : null },
    { label: 'Observaciones', value: m.observaciones },
  ]
}
