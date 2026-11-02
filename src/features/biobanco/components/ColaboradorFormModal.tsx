import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Colaborador, ColaboradorRequestDTO } from '@/types/api'
import { useCreateColaborador, useUpdateColaborador } from '../hooks/useEntregas'

interface ColaboradorFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  colaborador?: Colaborador | null
}

const VACIO: ColaboradorRequestDTO = {
  nombre: '', segundoNombre: '', apellidoPaterno: '', apellidoMaterno: '',
  fechaNacimiento: '', sexo: '', telefono: '', curp: '', email: '',
  cargo: '', adscripcion: '', esExterno: false,
}

export function ColaboradorFormModal({ open, onOpenChange, colaborador }: ColaboradorFormModalProps) {
  const esEdicion = !!colaborador
  const crear = useCreateColaborador()
  const actualizar = useUpdateColaborador()
  const [form, setForm] = useState<ColaboradorRequestDTO>(VACIO)

  useEffect(() => {
    if (!open) return
    if (colaborador) {
      setForm({
        nombre: colaborador.nombre ?? '',
        segundoNombre: colaborador.segundoNombre ?? '',
        apellidoPaterno: colaborador.apellidoPaterno ?? '',
        apellidoMaterno: colaborador.apellidoMaterno ?? '',
        fechaNacimiento: colaborador.fechaNacimiento ?? '',
        sexo: colaborador.sexo ?? '',
        telefono: colaborador.telefono ?? '',
        curp: colaborador.curp ?? '',
        email: colaborador.email ?? '',
        cargo: colaborador.cargo ?? '',
        adscripcion: colaborador.adscripcion ?? '',
        esExterno: colaborador.esExterno ?? false,
      })
    } else {
      setForm(VACIO)
    }
  }, [open, colaborador])

  const set = <K extends keyof ColaboradorRequestDTO>(k: K, v: ColaboradorRequestDTO[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submitting = crear.isPending || actualizar.isPending

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !form.apellidoPaterno.trim()) {
      toast.error('Nombre y apellido paterno son obligatorios.')
      return
    }
    // Limpia las cadenas vacías para no mandar "" donde el backend espera null.
    const payload: ColaboradorRequestDTO = {
      ...form,
      nombre: form.nombre.trim(),
      apellidoPaterno: form.apellidoPaterno.trim(),
      segundoNombre: form.segundoNombre?.trim() || undefined,
      apellidoMaterno: form.apellidoMaterno?.trim() || undefined,
      fechaNacimiento: form.fechaNacimiento || undefined,
      sexo: form.sexo || undefined,
      telefono: form.telefono?.trim() || undefined,
      curp: form.curp?.trim() || undefined,
      email: form.email?.trim() || undefined,
      cargo: form.cargo?.trim() || undefined,
      adscripcion: form.adscripcion?.trim() || undefined,
    }
    try {
      if (esEdicion) await actualizar.mutateAsync({ id: colaborador!.id, data: payload })
      else await crear.mutateAsync(payload)
      onOpenChange(false)
    } catch { /* el hook ya muestra el toast */ }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {esEdicion ? 'Editar colaborador' : 'Registrar colaborador'}
          </DialogTitle>
          <DialogDescription>
            Persona física que recibe muestras del biobanco. No necesita cuenta en el sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3 overflow-y-auto flex-1 min-h-0 pr-1">
          <Campo label="Nombre *">
            <Input value={form.nombre} maxLength={100} disabled={submitting}
              onChange={(e) => set('nombre', e.target.value)} />
          </Campo>
          <Campo label="Segundo nombre">
            <Input value={form.segundoNombre} maxLength={100} disabled={submitting}
              onChange={(e) => set('segundoNombre', e.target.value)} />
          </Campo>
          <Campo label="Apellido paterno *">
            <Input value={form.apellidoPaterno} maxLength={100} disabled={submitting}
              onChange={(e) => set('apellidoPaterno', e.target.value)} />
          </Campo>
          <Campo label="Apellido materno">
            <Input value={form.apellidoMaterno} maxLength={100} disabled={submitting}
              onChange={(e) => set('apellidoMaterno', e.target.value)} />
          </Campo>
          <Campo label="Sexo">
            <Select value={form.sexo || undefined} onValueChange={(v) => set('sexo', v)} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Fecha de nacimiento">
            <Input type="date" value={form.fechaNacimiento} disabled={submitting}
              onChange={(e) => set('fechaNacimiento', e.target.value)} />
          </Campo>
          <Campo label="Teléfono">
            <Input value={form.telefono} maxLength={10} disabled={submitting}
              onChange={(e) => set('telefono', e.target.value)} />
          </Campo>
          <Campo label="CURP">
            <Input value={form.curp} maxLength={18} disabled={submitting}
              onChange={(e) => set('curp', e.target.value.toUpperCase())} />
          </Campo>
          <Campo label="Correo">
            <Input type="email" value={form.email} maxLength={50} disabled={submitting}
              onChange={(e) => set('email', e.target.value)} />
          </Campo>
          <Campo label="Cargo">
            <Input value={form.cargo} maxLength={150} disabled={submitting}
              placeholder="Investigador, técnico…"
              onChange={(e) => set('cargo', e.target.value)} />
          </Campo>
          <Campo label="Adscripción" full>
            <Input value={form.adscripcion} maxLength={200} disabled={submitting}
              placeholder="Dependencia o institución (p. ej. Facultad de Química)"
              onChange={(e) => set('adscripcion', e.target.value)} />
          </Campo>
          <div className="@sm:col-span-2 flex items-center gap-3 rounded-md border border-dashed px-3 py-2">
            <Switch checked={!!form.esExterno} onCheckedChange={(v) => set('esExterno', v)} disabled={submitting} />
            <div>
              <Label className="cursor-pointer text-xs font-medium">Colaborador externo</Label>
              <p className="text-[11px] text-muted-foreground">Ajeno a la red de la cohorte (institución externa).</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Guardando…</>
              : esEdicion ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? '@sm:col-span-2' : ''}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
