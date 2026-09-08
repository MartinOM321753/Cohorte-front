import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  ArrowDown, ArrowUp, Image as ImageIcon, Link2, Table2, Trash2, Unlink2,
} from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'

import type {
  Banda, ColumnaTabla, Elemento, ElementoFigura, ElementoImagen, ElementoTabla,
  EstiloTabla, FormaFigura, RadiosEsquina,
} from '../types'
import {
  altoParaProporcion, cuantasColumnas, FORMAS_CON_RELLENO, FORMAS_DE_TRAZO,
  radiosDe, ROTULOS_FORMA, rotuloDeElemento, TABLA_POR_DEFECTO,
} from '../types'
import { useCamposReporte } from '../hooks/useReportes'
import type { CampoReporte, ImagenReporte } from '../types.api'
import { SelectorParametros } from './SelectorParametros'
import { GaleriaImagenes } from './GaleriaImagenes'
import { SelectorIcono } from './SelectorIcono'
import { caracterDeIcono } from '../lib/catalogoIconos'
import { idDeClaveImagen, urlDeImagen } from '../api/imagenes.api'
import { useImagenesReporte } from '../hooks/useImagenesReporte'
import type { OrigenSeleccion } from './SelectorParametros'

/**
 * De qué estudio es un bloque, leído de su propia clave.
 *
 * El tipo va dentro de la clave —bloque.estudio.10.resultados— y no en la
 * plantilla, que es lo que permite tener en la misma hoja la tabla de un estudio
 * y las evidencias de otro.
 */
function tipoEstudioDe(clave: string): number | null {
  const m = /^bloque\.estudio\.(\d+)\./.exec(clave)
  return m ? Number(m[1]) : null
}

/**
 * De dónde salen las filas que se pueden marcar en este bloque.
 *
 * Los parámetros de un estudio y los analitos de laboratorio se eligen igual pero
 * salen de catálogos distintos, y la clave del bloque es lo que los distingue.
 */
function origenDe(clave: string): OrigenSeleccion {
  return clave === 'bloque.examenes.listado'
    ? { tipo: 'examenes' }
    : { tipo: 'estudio', idTipoEstudio: tipoEstudioDe(clave) }
}

interface Props {
  elemento: Elemento | null
  /** Cuántos hay elegidos en total. Con más de uno solo caben acciones comunes. */
  cuantosSeleccionados: number
  /** En qué banda vive el elemento: la hoja, el encabezado o el pie. */
  banda: Banda
  bandasDisponibles: { encabezado: boolean; pie: boolean }
  onCambiar: (cambios: Partial<Elemento>) => void
  onCambiarBanda: (destino: Banda) => void
  onEliminar: () => void
  onSubirCapa: () => void
  onBajarCapa: () => void
  /** Abre el diálogo donde se escriben las celdas de una tabla. */
  onEditarTabla: () => void
}

/**
 * Las propiedades del elemento seleccionado.
 *
 * <p>Las medidas se editan en milímetros, igual que se guardan. Un campo que
 * dijera «píxeles» sería mentira: el resultado va a papel.</p>
 */
export function PanelPropiedades({
  elemento, cuantosSeleccionados, banda, bandasDisponibles,
  onCambiar, onCambiarBanda, onEliminar, onSubirCapa, onBajarCapa, onEditarTabla,
}: Props) {
  // Antes de cualquier retorno: es un hook y no puede quedar detrás de un if.
  const { data: campos } = useCamposReporte()

  const campo: CampoReporte | undefined =
    elemento && elemento.tipo === 'datos'
      ? campos?.find((c) => c.clave === elemento.clave)
      : undefined

  // Lo que el bloque sabe imprimir y lo que el panel ofrece marcar salen los dos
  // del catálogo del servidor. Con una lista fija aquí, el listado de estudios
  // ofrecía «Parámetro / Resultado / Unidad / Referencia» mientras el documento
  // sacaba «Estudio / Fecha / Resultados».
  const columnasDisponibles = campo?.columnas ?? {}

  if (!elemento) {
    // Con varios elegidos no se muestran las propiedades de ninguno: editar «el
    // color» de cuatro cosas distintas a la vez pisaría tres sin avisar. Lo que sí
    // vale para todos —moverlos, agruparlos, borrarlos— está donde corresponde.
    if (cuantosSeleccionados > 1) {
      return (
        <div className="space-y-3 p-4">
          <p className="text-[13px]">
            {cuantosSeleccionados} elementos seleccionados.
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Arrástralos para moverlos juntos. Para que sigan yendo juntos a partir de
            ahora, agrúpalos desde la pestaña <b>Capas</b>.
          </p>
          <Button type="button" variant="outline" size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={onEliminar}>
            <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Eliminar los {cuantosSeleccionados}
          </Button>
        </div>
      )
    }
    return (
      <div className="p-4 text-[13px] text-muted-foreground">
        Selecciona un elemento de la hoja para ver sus propiedades, o agrega uno desde
        la barra de arriba. Lo bloqueado se selecciona desde la pestaña <b>Capas</b>.
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {rotuloDe(elemento)}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                  onClick={onBajarCapa} title="Enviar atrás">
            <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                  onClick={onSubirCapa} title="Traer al frente">
            <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button type="button" variant="ghost" size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={onEliminar} title="Eliminar elemento">
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[12px]">Nombre en las capas</Label>
        <Input className="h-9 text-[12px]" value={elemento.nombre ?? ''}
               placeholder={rotuloDeElemento(elemento)}
               onChange={(e) => onCambiar({ nombre: e.target.value } as Partial<Elemento>)} />
      </div>

      {(bandasDisponibles.encabezado || bandasDisponibles.pie) && (
        <div className="space-y-1">
          <Label className="text-[12px]">Dónde vive</Label>
          <Select value={banda} onValueChange={(v) => onCambiarBanda(v as Banda)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cuerpo">En la hoja</SelectItem>
              {bandasDisponibles.encabezado && (
                <SelectItem value="encabezado">En el encabezado</SelectItem>
              )}
              {bandasDisponibles.pie && <SelectItem value="pie">En el pie</SelectItem>}
            </SelectContent>
          </Select>
          {banda !== 'cuerpo' && (
            <p className="text-[11px] leading-tight text-muted-foreground">
              Se repite en todas las páginas. La Y se mide desde el borde de la banda,
              no desde el de la hoja.
            </p>
          )}
        </div>
      )}

      {/* ── Posición y tamaño ── */}
      <div className="grid grid-cols-2 gap-2">
        <CampoMm rotulo="X (mm)"     valor={elemento.xMm}     onCambiar={(v) => onCambiar({ xMm: v } as Partial<Elemento>)} />
        <CampoMm rotulo="Y (mm)"     valor={elemento.yMm}     onCambiar={(v) => onCambiar({ yMm: v } as Partial<Elemento>)} />
        <CampoMm rotulo="Ancho (mm)" valor={elemento.anchoMm} onCambiar={(v) => onCambiar({ anchoMm: v } as Partial<Elemento>)} />
        <CampoMm rotulo="Alto (mm)"  valor={elemento.altoMm}  onCambiar={(v) => onCambiar({ altoMm: v } as Partial<Elemento>)} />
      </div>

      {/* ── Propio de cada familia ── */}
      {elemento.tipo === 'texto' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-[12px]">Texto</Label>
            <textarea
              className="min-h-20 w-full rounded-md border border-[var(--border)] bg-background p-2 text-[13px]"
              value={elemento.contenido}
              onChange={(e) => onCambiar({ contenido: e.target.value } as Partial<Elemento>)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[12px]">Tamaño (pt)</Label>
              <Input type="number" min={4} max={72} step={0.5} className="h-9"
                     value={elemento.tamanoPt}
                     onChange={(e) => onCambiar({ tamanoPt: Number(e.target.value) } as Partial<Elemento>)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Color</Label>
              <Input type="color" className="h-9 p-1"
                     value={elemento.color}
                     onChange={(e) => onCambiar({ color: e.target.value } as Partial<Elemento>)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Alineación</Label>
            <Select value={elemento.alineacion}
                    onValueChange={(v) => onCambiar({ alineacion: v } as Partial<Elemento>)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
                <SelectItem value="justify">Justificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <Interruptor rotulo="Negrita" activo={!!elemento.negrita}
                         onCambiar={(v) => onCambiar({ negrita: v } as Partial<Elemento>)} />
            <Interruptor rotulo="Cursiva" activo={!!elemento.cursiva}
                         onCambiar={(v) => onCambiar({ cursiva: v } as Partial<Elemento>)} />
          </div>
        </div>
      )}

      {elemento.tipo === 'figura' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-[12px]">Forma</Label>
            <Select value={elemento.forma}
                    onValueChange={(v) => onCambiar({ forma: v } as Partial<Elemento>)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROTULOS_FORMA) as FormaFigura[]).map((f) => (
                  <SelectItem key={f} value={f}>{ROTULOS_FORMA[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {FORMAS_CON_RELLENO.includes(elemento.forma) && (
              <div className="space-y-1">
                <Label className="text-[12px]">Relleno</Label>
                <Input type="color" className="h-9 p-1"
                       value={elemento.relleno ?? '#e2e8f0'}
                       onChange={(e) => onCambiar({ relleno: e.target.value } as Partial<Elemento>)} />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[12px]">
                {FORMAS_DE_TRAZO.includes(elemento.forma) ? 'Color' : 'Borde'}
              </Label>
              <Input type="color" className="h-9 p-1"
                     value={elemento.colorBorde ?? '#334155'}
                     onChange={(e) => onCambiar({ colorBorde: e.target.value } as Partial<Elemento>)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CampoMm rotulo="Grosor (mm)" valor={elemento.grosorBordeMm ?? 0} paso={0.1}
                     onCambiar={(v) => onCambiar({ grosorBordeMm: v } as Partial<Elemento>)} />
            <div className="space-y-1">
              <Label className="text-[12px]">Trazo</Label>
              <Select value={elemento.estiloBorde ?? 'solid'}
                      onValueChange={(v) => onCambiar({ estiloBorde: v } as Partial<Elemento>)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Continuo</SelectItem>
                  <SelectItem value="dashed">Discontinuo</SelectItem>
                  <SelectItem value="dotted">Punteado</SelectItem>
                  <SelectItem value="double">Doble</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {elemento.forma === 'flecha' && (
            <div className="space-y-1">
              <Label className="text-[12px]">Puntas</Label>
              <Select value={elemento.punta ?? 'fin'}
                      onValueChange={(v) => onCambiar({ punta: v } as Partial<Elemento>)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fin">Al final</SelectItem>
                  <SelectItem value="inicio">Al principio</SelectItem>
                  <SelectItem value="ambas">En los dos extremos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {elemento.forma === 'rectangulo' && (
            <EsquinasRedondeadas elemento={elemento} onCambiar={onCambiar} />
          )}
        </div>
      )}

      {elemento.tipo === 'imagen' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-[12px]">Imagen</Label>
            <ElegirImagen
              clave={elemento.url}
              onElegir={(clave, descripcion, imagen) => {
                // La caja se cuadra a la proporción de la imagen elegida. Sin esto,
                // toda imagen caía en la caja de 40×25 con la que nace el elemento
                // y había que ajustarla a mano cada vez.
                const alto = altoParaProporcion(elemento.anchoMm, imagen)
                onCambiar({
                  url: clave,
                  descripcion,
                  ...(alto ? { altoMm: alto } : {}),
                } as Partial<Elemento>)
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Texto alternativo</Label>
            <Input className="h-9 text-[12px]" value={elemento.descripcion ?? ''}
                   placeholder="Qué se ve en la imagen"
                   onChange={(e) => onCambiar({ descripcion: e.target.value } as Partial<Elemento>)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Cómo se coloca</Label>
            <Select value={elemento.ajuste ?? 'contener'}
                    onValueChange={(v) => onCambiar({ ajuste: v } as Partial<Elemento>)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contener">Entera, sin deformar</SelectItem>
                <SelectItem value="cubrir">Llenar recortando</SelectItem>
                <SelectItem value="estirar">Estirar hasta la caja</SelectItem>
                <SelectItem value="libre">Encuadre libre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {elemento.ajuste === 'libre' && (
            <EncuadreLibre elemento={elemento} onCambiar={onCambiar} />
          )}
        </div>
      )}

      {elemento.tipo === 'icono' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-[12px]">Icono</Label>
            <ElegirIcono
              codigo={elemento.codigo}
              nombre={elemento.nombre}
              onElegir={(codigo, nombre) => onCambiar({ codigo, nombre } as Partial<Elemento>)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Color</Label>
            <Input type="color" className="h-9 p-1"
                   value={elemento.color ?? '#33505c'}
                   onChange={(e) => onCambiar({ color: e.target.value } as Partial<Elemento>)} />
          </div>
          <p className="text-[11px] leading-tight text-muted-foreground">
            El icono ocupa el lado corto de su caja, así que se agranda tirando de
            una esquina.
          </p>
        </div>
      )}

      {elemento.tipo === 'tabla' && (
        <AspectoDeTabla
          elemento={elemento}
          onEditarContenido={onEditarTabla}
          onCambiar={onCambiar}
        />
      )}

      {elemento.tipo === 'datos' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-[12px]">Si no cabe en la caja</Label>
            <Select value={elemento.desbordamiento}
                    onValueChange={(v) => onCambiar({ desbordamiento: v } as Partial<Elemento>)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="crecer">Crecer y continuar en otra página</SelectItem>
                <SelectItem value="ajustar">Reducir el texto hasta que quepa</SelectItem>
                <SelectItem value="recortar">Mostrar solo lo que entra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {campo?.seleccionable && (
            <div className="space-y-1">
              <Label className="text-[12px]">
                {origenDe(elemento.clave).tipo === 'examenes'
                  ? 'Qué exámenes se muestran'
                  : 'Qué parámetros se muestran'}
              </Label>
              <SelectorParametros
                origen={origenDe(elemento.clave)}
                seleccion={elemento.seleccion ?? []}
                onCambiar={(seleccion) => onCambiar({ seleccion } as Partial<Elemento>)}
              />
            </div>
          )}

          {Object.keys(columnasDisponibles).length > 0 && (
            <EstiloDeTabla
              estilo={elemento.estilo ?? {}}
              columnasDisponibles={columnasDisponibles}
              onCambiar={(estilo) => onCambiar({ estilo } as Partial<Elemento>)}
            />
          )}
        </div>
      )}

      {/* ── Comunes ── */}
      <div className="space-y-3 border-t pt-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[12px]">Giro</Label>
            <span className="text-[11px] text-muted-foreground">
              {elemento.rotacionGrados ?? 0}°
            </span>
          </div>
          <input
            type="range" min={-180} max={180} step={1}
            className="w-full accent-[var(--primary)]"
            value={elemento.rotacionGrados ?? 0}
            onChange={(e) => onCambiar({ rotacionGrados: Number(e.target.value) } as Partial<Elemento>)}
          />
          {!!elemento.rotacionGrados && (
            <p className="text-[11px] leading-tight text-muted-foreground">
              Las manijas siguen trabajando sin girar, así que redimensionar un
              elemento torcido no arrastra el giro.
            </p>
          )}
        </div>

        {/* Dentro de una banda la repetición ya es el comportamiento: ofrecer el
            interruptor ahí daría a entender que se puede apagar. */}
        {banda === 'cuerpo' && (
          <Interruptor
            rotulo="Repetir en todas las páginas"
            activo={!!elemento.repiteEnTodas}
            onCambiar={(v) => onCambiar({ repiteEnTodas: v } as Partial<Elemento>)}
          />
        )}
        <Interruptor
          rotulo="Oculto"
          activo={!!elemento.oculto}
          onCambiar={(v) => onCambiar({ oculto: v } as Partial<Elemento>)}
        />
        <Interruptor
          rotulo="Bloqueado"
          activo={!!elemento.bloqueado}
          onCambiar={(v) => onCambiar({ bloqueado: v } as Partial<Elemento>)}
        />
      </div>
    </div>
  )
}

function CampoMm({ rotulo, valor, onCambiar, paso = 1 }: {
  rotulo: string; valor: number; onCambiar: (v: number) => void; paso?: number
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[12px]">{rotulo}</Label>
      <Input
        type="number" step={paso} className="h-9"
        value={Number.isFinite(valor) ? Math.round(valor * 10) / 10 : 0}
        onChange={(e) => {
          const v = Number(e.target.value)
          // Un campo vacío da NaN y arrastraría el elemento fuera de la hoja.
          if (Number.isFinite(v)) onCambiar(v)
        }}
      />
    </div>
  )
}

function Interruptor({ rotulo, activo, onCambiar }: {
  rotulo: string; activo: boolean; onCambiar: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-[12px]">
      <Switch checked={activo} onCheckedChange={onCambiar} />
      {rotulo}
    </label>
  )
}

function rotuloDe(elemento: Elemento): string {
  switch (elemento.tipo) {
    case 'texto':  return 'Texto'
    case 'imagen': return 'Imagen'
    case 'datos':  return 'Dato'
    case 'icono':  return 'Icono'
    case 'tabla':  return 'Tabla'
    // Del mapa compartido y no de una cadena de condiciones: la que había solo
    // conocía tres formas, así que a un rombo lo llamaba «Línea».
    case 'figura': return ROTULOS_FORMA[elemento.forma] ?? 'Figura'
  }
}

/**
 * El aspecto de una tabla hecha a mano. Su contenido se edita aparte, en su
 * propio diálogo: en esta columna no cabe una rejilla.
 */
function AspectoDeTabla({ elemento, onEditarContenido, onCambiar }: {
  elemento: ElementoTabla
  onEditarContenido: () => void
  onCambiar: (cambios: Partial<Elemento>) => void
}) {
  const columnas = cuantasColumnas(elemento)
  const filas = elemento.filas?.length ?? 0

  return (
    <div className="space-y-3 border-t pt-3">
      <Button type="button" variant="outline" size="sm" className="w-full"
              onClick={onEditarContenido}>
        <Table2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
        Editar el contenido
      </Button>
      <p className="text-[11px] leading-tight text-muted-foreground">
        {filas} × {columnas}. También se abre haciendo doble clic sobre la tabla en la
        hoja.
      </p>

      <Interruptor
        rotulo="La primera fila es el encabezado"
        activo={elemento.conEncabezado !== false}
        onCambiar={(v) => onCambiar({ conEncabezado: v } as Partial<Elemento>)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[12px]">Tamaño (pt)</Label>
          <Input type="number" min={4} max={36} step={0.5} className="h-9"
                 value={elemento.tamanoPt ?? TABLA_POR_DEFECTO.tamanoPt}
                 onChange={(e) => onCambiar({ tamanoPt: Number(e.target.value) } as Partial<Elemento>)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Texto</Label>
          <Input type="color" className="h-9 p-1"
                 value={elemento.colorTexto ?? TABLA_POR_DEFECTO.colorTexto}
                 onChange={(e) => onCambiar({ colorTexto: e.target.value } as Partial<Elemento>)} />
        </div>
      </div>

      {elemento.conEncabezado !== false && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[12px]">Letra del encabezado</Label>
            <Input type="color" className="h-9 p-1"
                   value={elemento.colorEncabezado ?? TABLA_POR_DEFECTO.colorEncabezado}
                   onChange={(e) => onCambiar({ colorEncabezado: e.target.value } as Partial<Elemento>)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Fondo del encabezado</Label>
            <Input type="color" className="h-9 p-1"
                   value={elemento.fondoEncabezado ?? TABLA_POR_DEFECTO.fondoEncabezado}
                   onChange={(e) => onCambiar({ fondoEncabezado: e.target.value } as Partial<Elemento>)} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[12px]">Borde</Label>
          <Input type="color" className="h-9 p-1"
                 value={elemento.colorBorde ?? TABLA_POR_DEFECTO.colorBorde}
                 onChange={(e) => onCambiar({ colorBorde: e.target.value } as Partial<Elemento>)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Grosor (mm)</Label>
          <Input type="number" min={0} max={2} step={0.1} className="h-9"
                 value={elemento.grosorBordeMm ?? TABLA_POR_DEFECTO.grosorBordeMm}
                 onChange={(e) => onCambiar({ grosorBordeMm: Number(e.target.value) } as Partial<Elemento>)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[12px]">Aire dentro de las celdas (mm)</Label>
        <Input type="number" min={0} max={10} step={0.1} className="h-9"
               value={elemento.rellenoMm ?? TABLA_POR_DEFECTO.rellenoMm}
               onChange={(e) => onCambiar({ rellenoMm: Number(e.target.value) } as Partial<Elemento>)} />
      </div>

      {/* Las filas alternas son opcionales: encenderlas con un color por defecto
          y poder apagarlas es lo que evita tener que dar con el blanco exacto
          para volver atrás. */}
      <div className="space-y-1">
        <Interruptor
          rotulo="Sombrear las filas alternas"
          activo={!!elemento.fondoAlterno}
          onCambiar={(v) => onCambiar({ fondoAlterno: v ? FONDO_ALTERNO : undefined } as Partial<Elemento>)}
        />
        {!!elemento.fondoAlterno && (
          <Input type="color" className="h-9 p-1"
                 value={elemento.fondoAlterno}
                 onChange={(e) => onCambiar({ fondoAlterno: e.target.value } as Partial<Elemento>)} />
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-[12px]">Si no cabe en la caja</Label>
        <Select value={elemento.desbordamiento ?? 'crecer'}
                onValueChange={(v) => onCambiar({ desbordamiento: v } as Partial<Elemento>)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="crecer">Crecer hacia abajo</SelectItem>
            <SelectItem value="recortar">Mostrar solo lo que entra</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/** Con qué gris nacen las filas alternas al encenderlas. */
const FONDO_ALTERNO = '#f5f8f9'

/**
 * El selector de imagen: una vista de la elegida y el botón que abre la galería.
 *
 * <p>No hay campo para escribir una dirección, y es deliberado: quien descargaría esa
 * dirección al imprimir es el servidor, no el navegador de quien mira. Una URL pegada
 * en un diseño se convertiría en una petición saliendo de dentro de la red hacia donde
 * dijera esa plantilla.</p>
 */
function ElegirImagen({ clave, onElegir }: {
  clave: string
  onElegir: (clave: string, descripcion: string, imagen: ImagenReporte) => void
}) {
  const [abierta, setAbierta] = useState(false)
  const id = idDeClaveImagen(clave)
  const { data: imagenes } = useImagenesReporte()
  const elegida = id != null ? imagenes?.find((i) => i.id === id) : undefined

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="flex w-full items-center gap-2 rounded-md border p-2 text-left hover:bg-[var(--muted)]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border bg-white">
          {id != null
            ? <img src={urlDeImagen(id)} alt="" className="max-h-full max-w-full object-contain" />
            : <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px]">
            {elegida?.nombre ?? (id != null ? 'Imagen no encontrada' : 'Sin imagen')}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {id != null ? 'Cambiar' : 'Elegir de la galería'}
          </span>
        </span>
      </button>

      <GaleriaImagenes
        abierto={abierta}
        claveActual={clave}
        onCerrar={() => setAbierta(false)}
        onElegir={(img) => onElegir(img.clave, img.nombre, img)}
      />
    </>
  )
}

/** La vista del icono elegido y el botón que abre el catálogo. */
function ElegirIcono({ codigo, nombre, onElegir }: {
  codigo: string
  nombre?: string
  onElegir: (codigo: string, nombre: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center gap-2 rounded-md border p-2 text-left hover:bg-[var(--muted)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border"
              style={{ fontFamily: 'IconosReporte', fontSize: '22px', lineHeight: 1 }}>
          {caracterDeIcono(codigo)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px]">{nombre ?? 'Sin icono'}</span>
          <span className="block text-[11px] text-muted-foreground">Cambiar</span>
        </span>
      </button>

      <SelectorIcono
        abierto={abierto}
        codigoActual={codigo}
        onCerrar={() => setAbierto(false)}
        onElegir={(i) => onElegir(i.codigo, i.nombre)}
      />
    </>
  )
}

/**
 * Las cuatro esquinas de un rectángulo.
 *
 * <p>Van juntas mientras el candado esté echado, que es lo normal, y por separado
 * al soltarlo. Ofrecer siempre cuatro campos obligaría a escribir el mismo número
 * cuatro veces para el caso corriente.</p>
 */
function EsquinasRedondeadas({ elemento, onCambiar }: {
  elemento: ElementoFigura
  onCambiar: (cambios: Partial<Elemento>) => void
}) {
  const r = radiosDe(elemento)
  const iguales = r.supIzq === r.supDer && r.supDer === r.infDer && r.infDer === r.infIzq
  const [juntas, setJuntas] = useState(iguales)

  function poner(cambio: Partial<RadiosEsquina>) {
    // Se escribe siempre `radios` y se borra `radioMm`, para no dejar dos fuentes
    // de verdad que puedan discrepar.
    onCambiar({ radios: { ...r, ...cambio }, radioMm: undefined } as Partial<Elemento>)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[12px]">Esquinas (mm)</Label>
        <Button
          type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]"
          title={juntas ? 'Redondear cada esquina por separado' : 'Redondear las cuatro por igual'}
          onClick={() => setJuntas(!juntas)}
        >
          {juntas
            ? <Link2 className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
            : <Unlink2 className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />}
          {juntas ? 'Juntas' : 'Por separado'}
        </Button>
      </div>

      {juntas ? (
        <CampoMm rotulo="Las cuatro" valor={r.supIzq} paso={0.5}
                 onCambiar={(v) => poner({ supIzq: v, supDer: v, infDer: v, infIzq: v })} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <CampoMm rotulo="Sup. izq." valor={r.supIzq} paso={0.5}
                   onCambiar={(v) => poner({ supIzq: v })} />
          <CampoMm rotulo="Sup. der." valor={r.supDer} paso={0.5}
                   onCambiar={(v) => poner({ supDer: v })} />
          <CampoMm rotulo="Inf. izq." valor={r.infIzq} paso={0.5}
                   onCambiar={(v) => poner({ infIzq: v })} />
          <CampoMm rotulo="Inf. der." valor={r.infDer} paso={0.5}
                   onCambiar={(v) => poner({ infDer: v })} />
        </div>
      )}
    </div>
  )
}

/**
 * El encuadre a mano: acercar y correr la imagen dentro de su caja.
 *
 * <p>Es el equivalente a recortar. En vez de pedir un recuadro de recorte sobre la
 * imagen original, se mueve la imagen detrás de una ventana fija —la caja del
 * elemento—, que es lo que hace falta cuando lo que importa es que el hueco del
 * formato quede lleno.</p>
 */
function EncuadreLibre({ elemento, onCambiar }: {
  elemento: ElementoImagen
  onCambiar: (cambios: Partial<Elemento>) => void
}) {
  const zoom = elemento.zoom ?? 1
  const dx = elemento.desplazamientoXMm ?? 0
  const dy = elemento.desplazamientoYMm ?? 0

  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[12px]">Acercamiento</Label>
          <span className="text-[11px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
        </div>
        <input
          type="range" min={20} max={400} step={5}
          className="w-full accent-[var(--primary)]"
          value={Math.round(zoom * 100)}
          onChange={(e) => onCambiar({ zoom: Number(e.target.value) / 100 } as Partial<Elemento>)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CampoMm rotulo="Correr en X (mm)" valor={dx} paso={0.5}
                 onCambiar={(v) => onCambiar({ desplazamientoXMm: v } as Partial<Elemento>)} />
        <CampoMm rotulo="Correr en Y (mm)" valor={dy} paso={0.5}
                 onCambiar={(v) => onCambiar({ desplazamientoYMm: v } as Partial<Elemento>)} />
      </div>

      <Button
        type="button" variant="ghost" size="sm" className="h-7 w-full text-[12px]"
        onClick={() => onCambiar({
          zoom: 1, desplazamientoXMm: 0, desplazamientoYMm: 0,
        } as Partial<Elemento>)}
      >
        Volver al centro
      </Button>
    </div>
  )
}

/**
 * Cómo se ve una tabla: letra, colores y qué columnas salen.
 *
 * Sin tocar nada, la tabla sale con el aspecto de siempre. Lo que se cambia se
 * guarda; lo que no, lo resuelve el servidor con el mismo valor por defecto, así
 * que una plantilla vieja no cambia de aspecto al abrirla.
 */
function EstiloDeTabla({ estilo, columnasDisponibles, onCambiar }: {
  estilo: EstiloTabla
  /** Las que este bloque sabe imprimir, clave → rótulo y en orden. */
  columnasDisponibles: Record<string, string>
  onCambiar: (estilo: EstiloTabla) => void
}) {
  const claves = Object.keys(columnasDisponibles) as ColumnaTabla[]

  // Se descarta lo guardado que este bloque no admita: pasa al cambiar la clave de
  // un elemento ya diseñado, y el servidor hace el mismo descarte al imprimir.
  const guardadas = (estilo.columnas ?? []).filter((c) => claves.includes(c))
  const columnas = guardadas.length > 0 ? guardadas : claves

  function alternarColumna(col: ColumnaTabla) {
    const nueva = columnas.includes(col)
      ? columnas.filter((c) => c !== col)
      : (claves.filter((c) => columnas.includes(c) || c === col) as ColumnaTabla[])
    // Quitarlas todas dejaría una tabla de filas vacías; se ignora la última.
    if (nueva.length === 0) return
    onCambiar({ ...estilo, columnas: nueva })
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Aspecto de la tabla
      </span>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[12px]">Letra (pt)</Label>
          <Input type="number" min={5} max={20} step={0.5} className="h-9"
                 value={estilo.tamanoPt ?? 9}
                 onChange={(e) => onCambiar({ ...estilo, tamanoPt: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Color del texto</Label>
          <Input type="color" className="h-9 p-1"
                 value={estilo.colorTexto ?? '#111111'}
                 onChange={(e) => onCambiar({ ...estilo, colorTexto: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Letra del encabezado</Label>
          <Input type="color" className="h-9 p-1"
                 value={estilo.colorEncabezado ?? '#33505c'}
                 onChange={(e) => onCambiar({ ...estilo, colorEncabezado: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Fondo del encabezado</Label>
          <Input type="color" className="h-9 p-1"
                 value={estilo.fondoEncabezado ?? '#eef3f5'}
                 onChange={(e) => onCambiar({ ...estilo, fondoEncabezado: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Líneas</Label>
          <Input type="color" className="h-9 p-1"
                 value={estilo.colorBorde ?? '#dde5e9'}
                 onChange={(e) => onCambiar({ ...estilo, colorBorde: e.target.value })} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-[12px]">
        <Switch checked={estilo.mostrarEncabezado ?? true}
                onCheckedChange={(v) => onCambiar({ ...estilo, mostrarEncabezado: v })} />
        Mostrar encabezado
      </label>

      <div className="space-y-1">
        <Label className="text-[12px]">Columnas</Label>
        <div className="space-y-1 rounded-md border p-2">
          {claves.map((col) => (
            <label key={col} className="flex items-center gap-2 text-[12px]">
              <Checkbox checked={columnas.includes(col)} onCheckedChange={() => alternarColumna(col)} />
              {columnasDisponibles[col]}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
