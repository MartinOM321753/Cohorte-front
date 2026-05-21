import { useForm, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { ParametroEstudio } from '@/types/api'

interface FormEngineProps {
  parametros: ParametroEstudio[]
  onSubmit: (data: Record<string, unknown>) => void
  isLoading?: boolean
  submitLabel?: string
}

export function FormEngine({
  parametros,
  onSubmit,
  isLoading = false,
  submitLabel = 'Guardar',
}: FormEngineProps) {
  const { control, handleSubmit, register } = useForm()

  const renderField = (parametro: ParametroEstudio) => {
    const { id, nombre, unidad, tipo } = parametro
    const fieldName = `param_${id}`

    switch (tipo) {
      case 'NUMERICO':
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {nombre} {unidad && <span className="text-muted-foreground">({unidad})</span>}
            </Label>
            <Input
              id={fieldName}
              type="number"
              step="any"
              {...register(fieldName, { valueAsNumber: true })}
            />
          </div>
        )

      case 'TEXTO':
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={fieldName}>{nombre}</Label>
            <Textarea id={fieldName} {...register(fieldName)} />
          </div>
        )

      case 'BOOLEANO':
        return (
          <div key={id} className="flex items-center space-x-2">
            <Controller
              name={fieldName}
              control={control}
              render={({ field }) => (
                <Checkbox
                  id={fieldName}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor={fieldName}>{nombre}</Label>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {parametros.map(renderField)}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}
