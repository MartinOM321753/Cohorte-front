import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pacienteFormSchema, type PacienteFormData } from '../schemas/paciente.schema'
import { useCreatePaciente } from '../hooks/useCreatePaciente'
import { Paciente, PacienteRequestDTO } from '@/types/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PacienteFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (paciente: Paciente) => void
}

export function PacienteFormModal({ open, onOpenChange, onSuccess }: PacienteFormModalProps) {
  const { register, handleSubmit, reset, setValue, formState: { errors }, watch } = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteFormSchema),
  })
  const createMutation = useCreatePaciente()
  const sexo = watch('sexo')

  const onSubmit = (data: PacienteFormData) => {
    const requestData: PacienteRequestDTO = {
      folio: data.folio,
      persona: {
        nombre: data.nombre,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno || undefined,
        email: data.email || undefined,
        telefono: data.telefono || undefined,
        fechaNacimiento: data.fechaNacimiento,
        sexo: data.sexo,
      },
    }

    createMutation.mutate(requestData, {
      onSuccess: (paciente) => {
        reset()
        onOpenChange(false)
        onSuccess?.(paciente)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Paciente</DialogTitle>
          <DialogDescription>
            Completa los datos del nuevo paciente en el sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Folio */}
          <FormField
            label="Folio"
            required
            error={errors.folio?.message}
          >
            <Input placeholder="Ej: PAC-001" {...register('folio')} />
          </FormField>

          {/* Personal Info - Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Nombre"
              required
              error={errors.nombre?.message}
            >
              <Input placeholder="Juan" {...register('nombre')} />
            </FormField>
            <FormField
              label="Apellido Paterno"
              required
              error={errors.apellidoPaterno?.message}
            >
              <Input placeholder="García" {...register('apellidoPaterno')} />
            </FormField>
          </div>

          {/* Personal Info - Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Apellido Materno"
              error={errors.apellidoMaterno?.message}
            >
              <Input placeholder="López" {...register('apellidoMaterno')} />
            </FormField>
            <FormField
              label="Sexo"
              required
              error={errors.sexo?.message}
            >
              <Select value={sexo || ''} onValueChange={(value) => setValue('sexo', value as 'M' | 'F')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Contact Info - Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Fecha de Nacimiento"
              required
              error={errors.fechaNacimiento?.message}
            >
              <Input type="date" {...register('fechaNacimiento')} />
            </FormField>
            <FormField
              label="Teléfono"
              error={errors.telefono?.message}
            >
              <Input placeholder="1234567890" {...register('telefono')} />
            </FormField>
          </div>

          {/* Contact Info - Row 4 */}
          <div className="grid grid-cols-1 gap-4">
            <FormField
              label="Email"
              error={errors.email?.message}
            >
              <Input type="email" placeholder="juan@example.com" {...register('email')} />
            </FormField>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creando...
                </>
              ) : (
                'Crear Paciente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
