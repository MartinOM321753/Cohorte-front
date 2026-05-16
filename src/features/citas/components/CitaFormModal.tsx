import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { citaFormSchema, type CitaFormData } from "../schemas/cita.schema";
import { useGetPacientes } from "@/features/pacientes/hooks/useGetPacientes";
import { useCreateCita } from "../hooks/useCitas";
import { useAuthStore } from "@/stores/authStore";
import { CitaRequestDTO } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFullName } from "@/lib/utils";
import { AlertCircle, Plus } from "lucide-react";
import { PacienteFormModal } from "@/features/pacientes/components/PacienteFormModal";
import { Paciente } from "@/types/api";

interface CitaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPacienteUUID?: string;
}

export function CitaFormModal({
  open,
  onOpenChange,
  initialPacienteUUID,
}: CitaFormModalProps) {
  const { user } = useAuthStore();
  const {
    data: pacientes,
    isLoading: pacientesLoading,
    refetch,
  } = useGetPacientes({ activos: true });
  const createCita = useCreateCita();
  const [showPacienteForm, setShowPacienteForm] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const defaultValues = useMemo(
    () => ({
      pacienteUUID: initialPacienteUUID || "",
      fechaCita: "",
      duracionMinutos: 60,
      observaciones: "",
    }),
    [initialPacienteUUID],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CitaFormData>({
    resolver: zodResolver(citaFormSchema),
    defaultValues,
  });

  const getPacienteUUID = (paciente: Paciente) =>
    paciente.UUID || (paciente as unknown as { uuid?: string }).uuid || "";

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      return;
    }

    const timer = setTimeout(() => {
      reset(defaultValues);
    }, 150);

    return () => clearTimeout(timer);
  }, [open, reset, defaultValues]);

  const onSubmit = (data: CitaFormData) => {
    console.log("Form data recibida:", JSON.stringify(data));
    const requestData: CitaRequestDTO = {
      pacienteUUID: data.pacienteUUID,
      usuarioAgendaUUID: user?.uuid || "",
      fechaCita: data.fechaCita,
      duracionMinutos: data.duracionMinutos,
      observaciones: data.observaciones?.trim() || undefined,
    };

    createCita.mutate(requestData, {
      onSuccess: () => {
        reset(defaultValues);
        onOpenChange(false);
      },
    });
  };

  const handlePacienteCreated = (paciente: Paciente) => {
    setShowPacienteForm(false);
    refetch();
    setValue("pacienteUUID", getPacienteUUID(paciente));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={dialogContentRef}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Agendar Cita</DialogTitle>
            <DialogDescription>
              Selecciona paciente, fecha y duración para programar una nueva
              cita.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label>Paciente</Label>
                <Controller
                  name="pacienteUUID"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {pacientesLoading ? (
                          <SelectItem value="" disabled>
                            Cargando pacientes...
                          </SelectItem>
                        ) : (
                          (Array.isArray(pacientes) ? pacientes : []).map(
                            (paciente) => {
                              const pacienteId = getPacienteUUID(paciente);

                              return (
                                <SelectItem
                                  key={pacienteId || paciente.folio}
                                  value={pacienteId}
                                >
                                  {paciente.folio} -{" "}
                                  {getFullName(paciente.persona)}
                                </SelectItem>
                              );
                            },
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.pacienteUUID && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                    {errors.pacienteUUID.message}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => setShowPacienteForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo paciente
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Fecha y hora"
                required
                error={errors.fechaCita?.message}
              >
                <Input type="datetime-local" {...register("fechaCita")} />
              </FormField>
              <FormField
                label="Duración (min)"
                required
                error={errors.duracionMinutos?.message}
              >
                <Input
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  {...register("duracionMinutos", { valueAsNumber: true })}
                />
              </FormField>
            </div>

            <FormField
              label="Observaciones"
              error={errors.observaciones?.message}
            >
              <Controller
                name="observaciones"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Notas adicionales sobre la cita"
                    rows={4}
                  />
                )}
              />
            </FormField>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createCita.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createCita.isPending}
              >
                {createCita.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Agendando...
                  </>
                ) : (
                  "Programar cita"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PacienteFormModal
        open={showPacienteForm}
        onOpenChange={setShowPacienteForm}
        onSuccess={handlePacienteCreated}
      />
    </>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
          {error}
        </p>
      )}
    </div>
  );
}
