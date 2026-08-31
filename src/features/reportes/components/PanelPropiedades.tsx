import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react'

import type { Elemento } from '../types'

interface Props {
  elemento: Elemento | null
  onCambiar: (cambios: Partial<Elemento>) => void
  onEliminar: () => void
  onSubirCapa: () => void
  onBajarCapa: () => void
}

/**
 * Las propiedades del elemento seleccionado.
 *
 * <p>Las medidas se editan en milímetros, igual que se guardan. Un campo que
 * dijera «píxeles» sería mentira: el resultado va a papel.</p>
 */
export function PanelPropiedades({
  elemento, onCambiar, onEliminar, onSubirCapa, onBajarCapa,
}: Props) {
  if (!elemento) {
    return (
      <div className="p-4 text-[13px] text-muted-foreground">
        Selecciona un elemento de la hoja para ver sus propiedades, o agrega uno desde
        la barra de arriba.
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
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[12px]">Relleno</Label>
              <Input type="color" className="h-9 p-1"
                     value={elemento.relleno ?? '#e2e8f0'}
                     onChange={(e) => onCambiar({ relleno: e.target.value } as Partial<Elemento>)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Borde</Label>
              <Input type="color" className="h-9 p-1"
                     value={elemento.colorBorde ?? '#334155'}
                     onChange={(e) => onCambiar({ colorBorde: e.target.value } as Partial<Elemento>)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CampoMm rotulo="Grosor (mm)" valor={elemento.grosorBordeMm ?? 0} paso={0.1}
                     onCambiar={(v) => onCambiar({ grosorBordeMm: v } as Partial<Elemento>)} />
            {elemento.forma === 'rectangulo' && (
              <CampoMm rotulo="Esquinas (mm)" valor={elemento.radioMm ?? 0} paso={0.5}
                       onCambiar={(v) => onCambiar({ radioMm: v } as Partial<Elemento>)} />
            )}
          </div>
        </div>
      )}

      {elemento.tipo === 'imagen' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-[12px]">Dirección de la imagen</Label>
            <Input className="h-9 text-[12px]" value={elemento.url}
                   placeholder="https://…"
                   onChange={(e) => onCambiar({ url: e.target.value } as Partial<Elemento>)} />
            <p className="text-[11px] text-muted-foreground">
              Por ahora se pega la dirección. La carga de archivos llega con el resto
              del módulo de imágenes.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Cómo llena su caja</Label>
            <Select value={elemento.ajuste ?? 'contener'}
                    onValueChange={(v) => onCambiar({ ajuste: v } as Partial<Elemento>)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contener">Entera (puede dejar aire)</SelectItem>
                <SelectItem value="cubrir">Recortada (la llena)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── Comunes ── */}
      <div className="space-y-3 border-t pt-3">
        <Interruptor
          rotulo="Repetir en todas las páginas"
          activo={!!elemento.repiteEnTodas}
          onCambiar={(v) => onCambiar({ repiteEnTodas: v } as Partial<Elemento>)}
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
    case 'figura':
      return elemento.forma === 'rectangulo' ? 'Rectángulo'
           : elemento.forma === 'elipse' ? 'Elipse' : 'Línea'
  }
}
