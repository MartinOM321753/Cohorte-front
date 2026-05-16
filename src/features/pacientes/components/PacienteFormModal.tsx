import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import {
  pacienteFormSchema,
  type PacienteFormData,
} from "../schemas/paciente.schema";
import { useCreatePaciente } from "../hooks/useCreatePaciente";
import { Paciente, PacienteRequestDTO } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PacienteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (paciente: Paciente) => void;
}

const DEFAULT_VALUES: PacienteFormData = {
  folio: "",
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  email: "",
  telefono: "",
  fechaNacimiento: "",
  sexo: "M",
};

export function PacienteFormModal({
  open,
  onOpenChange,
  onSuccess,
}: PacienteFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    watch,
  } = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const createMutation = useCreatePaciente();
  const sexo = watch("sexo");

  const usesTwoColumnGrid = true;

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        reset(DEFAULT_VALUES);
      }, 150);
      return () => clearTimeout(timer);
    }
    return;
  }, [open, reset]);

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
    };

    createMutation.mutate(requestData, {
      onSuccess: (paciente) => {
        reset();
        onOpenChange(false);
        onSuccess?.(paciente);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          "max-h-[90vh] overflow-y-auto p-0",
          usesTwoColumnGrid ? "max-w-2xl" : "max-w-xl",
        ].join(" ")}
      >
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Registrar paciente</DialogTitle>
            <DialogDescription>
              Capture los datos del paciente para registrarlo en el sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-6">
            <div
              className={
                usesTwoColumnGrid
                  ? "grid grid-cols-1 gap-4 md:grid-cols-2"
                  : "grid grid-cols-1 gap-4"
              }
            >
              <FormField label="Folio" required error={errors.folio?.message}>
                <Input
                  placeholder="Ej. C-00184"
                  className="font-mono"
                  {...register("folio")}
                />
              </FormField>

              <div className="hidden md:block" />

              <FormField label="Nombre" required error={errors.nombre?.message}>
                <Input placeholder="Nombre(s)" {...register("nombre")} />
              </FormField>
              <FormField
                label="Apellido paterno"
                required
                error={errors.apellidoPaterno?.message}
              >
                <Input
                  placeholder="Apellido paterno"
                  {...register("apellidoPaterno")}
                />
              </FormField>

              <FormField
                label="Apellido materno"
                error={errors.apellidoMaterno?.message}
              >
                <Input
                  placeholder="Apellido materno"
                  {...register("apellidoMaterno")}
                />
              </FormField>
              <FormField label="Sexo" required error={errors.sexo?.message}>
                <Select
                  value={sexo || ""}
                  onValueChange={(value) =>
                    setValue("sexo", value as "M" | "F")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Fecha de nacimiento"
                required
                error={errors.fechaNacimiento?.message}
              >
                <Input type="date" {...register("fechaNacimiento")} />
              </FormField>
              <FormField label="Teléfono" error={errors.telefono?.message}>
                <Input placeholder="10 dígitos" {...register("telefono")} />
              </FormField>

              <FormField
                label="Correo electrónico"
                error={errors.email?.message}
                
              >
                <Input
                  type="email"
                  placeholder="correo@dominio.com"
                  {...register("email")}
                />
              </FormField>
            </div>

            <div className="-mx-6 border-t border-border bg-[--imss-paper] px-6 py-3">
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Registrando…
                    </>
                  ) : (
                    "Registrar paciente"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
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
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-[1px] size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
