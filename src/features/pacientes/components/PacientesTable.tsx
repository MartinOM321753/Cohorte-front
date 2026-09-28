import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import {
  Activity,
  CalendarPlus,
  FileText,
  KeyRound,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getFullName } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { Paciente } from "@/types/api";

interface PacientesTableProps {
  data: Paciente[];
  isLoading?: boolean;
  incluirJerarquia?: boolean;
  /** Clic en la fila (columnas que no sean Participante ni Estado) → panel lateral. */
  onRowClick: (paciente: Paciente) => void;
  onEdit?: (paciente: Paciente) => void;
  onToggleActivo?: (paciente: Paciente) => void;
  onSchedule?: (paciente: Paciente) => void;
  onCrearAcceso?: (paciente: Paciente) => void;
  onSomatometria?: (paciente: Paciente) => void;
  manualPagination?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  pageCount?: number;
  totalElements?: number;
}

function getRowClassName(p: Paciente): string {
  const { curp, telefono, email } = p.persona;
  if (!curp) return "shadow-[inset_3px_0_0_#BA0000]";
  const hasPhone = !!telefono;
  const hasEmail = !!email;
  if (!hasPhone && !hasEmail) return "shadow-[inset_3px_0_0_#E66500]";
  if (!hasPhone || !hasEmail) return "shadow-[inset_3px_0_0_#FFF700]";
  return "";
}

function SexoBadge({ sexo }: { sexo: string | null | undefined }) {
  if (sexo === "M")
    return (
      <span className="inline-flex items-center rounded-full bg-(--status-info-bg) px-2.5 py-0.5 text-[11px] font-medium text-(--status-info-fg)">
        Masculino
      </span>
    );
  if (sexo === "F")
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
        Femenino
      </span>
    );
  return <span className="text-[13px] text-[var(--imss-ink-300)]">—</span>;
}

export function PacientesTable({
  data,
  isLoading,
  incluirJerarquia,
  onRowClick,
  onEdit,
  onToggleActivo,
  onSchedule,
  onCrearAcceso,
  onSomatometria,
  manualPagination,
  pagination,
  onPaginationChange,
  pageCount,
  totalElements,
}: PacientesTableProps) {
  const navigate = useNavigate();
  const hasPermiso = useAuthStore((s) => s.hasPermiso);

  // Participante pendiente de confirmar el cambio de estado.
  const [toggleTarget, setToggleTarget] = useState<Paciente | null>(null);

  const abrirExpediente = (p: Paciente) =>
    navigate("/pacientes/expediente", { state: { uuid: p.uuid } });

  const columns: ColumnDef<Paciente>[] = [
    {
      id: "nombre",
      header: "Participante",
      cell: ({ row }) => {
        const p = row.original;
        // Clic en el nombre → expediente (no abre el menú de la fila).
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              abrirExpediente(p);
            }}
            className="text-left group/nombre"
            title="Abrir expediente"
          >
            <p className="text-[13px] font-medium text-[var(--imss-ink-900)] group-hover/nombre:text-[var(--imss-green-700)] group-hover/nombre:underline">
              {getFullName(p.persona)}
            </p>
            <p className="text-[11px] text-[var(--imss-ink-300)]">
              Folio: {p.folio}
            </p>
          </button>
        );
      },
    },
    {
      id: "noConsecutivo",
      header: "No. consec.",
      cell: ({ row }) => {
        const n = row.original.noConsecutivo;
        // La raya no es decorativa: sin ella, una celda vacía se lee como un dato
        // que no cargó en lugar de un participante que no tiene número.
        return (
          <span className="font-mono text-[13px] text-[var(--imss-ink-500)]">
            {n != null ? n : "—"}
          </span>
        );
      },
    },
    {
      id: "sexo",
      header: "Sexo",
      cell: ({ row }) => <SexoBadge sexo={row.original.persona.sexo} />,
    },
    ...(incluirJerarquia
      ? [
          {
            id: "institucion",
            header: "Institución",
            cell: ({ row }: { row: { original: Paciente } }) => {
              const p = row.original;
              return (
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] text-[var(--imss-ink-500)]">
                    {p.institucionNombre || "—"}
                  </span>
                  {p.propiaInstitucion === false && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Externa
                    </span>
                  )}
                </div>
              );
            },
          } as ColumnDef<Paciente>,
        ]
      : []),
    {
      id: "email",
      header: "Correo",
      cell: ({ row }) => (
        <span className="text-[13px] text-[var(--imss-ink-500)]">
          {row.original.persona.email || "—"}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const p = row.original;
        const badge = p.activo ? (
          <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-danger-fg)]">
            Inactivo
          </span>
        );
        // Sin permiso para cambiar estado → badge estático.
        if (!onToggleActivo) return badge;
        // Clic en el estado → confirmar activar/desactivar (no abre el menú).
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setToggleTarget(p);
            }}
            className="rounded-full transition-shadow hover:ring-2 hover:ring-[var(--imss-green-300)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--imss-green-500)]"
            title={p.activo ? "Clic para desactivar" : "Clic para activar"}
          >
            {badge}
          </button>
        );
      },
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => {
        const p = row.original;
        const showCrearAcceso = p.activo && !p.tieneAcceso && hasPermiso('PACIENTES_CREAR_ACCESO');

        return (
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[var(--imss-ink-300)] hover:text-[var(--imss-ink-900)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/pacientes/expediente", { state: { uuid: p.uuid } });
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Ver expediente
                </DropdownMenuItem>
                {onSomatometria && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSomatometria(p);
                    }}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Somatometría
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(p);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onSchedule && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSchedule(p);
                    }}
                  >
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Agendar cita
                  </DropdownMenuItem>
                )}

                {showCrearAcceso && onCrearAcceso && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onCrearAcceso(p);
                      }}
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Crear acceso
                    </DropdownMenuItem>
                  </>
                )}

                {onToggleActivo && (
                  <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setToggleTarget(p);
                  }}
                  className={p.activo ? "text-destructive focus:text-destructive" : "text-green-600 focus:text-green-600"}
                >
                  {p.activo ? (
                    <>
                      <UserX className="mr-2 h-4 w-4" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activar
                    </>
                  )}
                </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const objetivo = toggleTarget;
  const activar = objetivo ? !objetivo.activo : false;

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        manualPagination={manualPagination}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        pageCount={pageCount}
        totalElements={totalElements}
        getRowClassName={getRowClassName}
        // Clic en la fila (columnas que no son Participante ni Estado) → panel lateral
        onRowClick={onRowClick}
      />

      <AlertDialog
        open={objetivo !== null}
        onOpenChange={(o) => { if (!o) setToggleTarget(null); }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">
              {activar ? "¿Activar a este participante?" : "¿Desactivar a este participante?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              {objetivo ? getFullName(objetivo.persona) : ""}
              {objetivo?.folio ? ` · Folio ${objetivo.folio}` : ""}
              {activar
                ? ". Volverá a contar en cobertura y se habilitarán sus operaciones."
                : ". Sus muestras quedan en cuarentena y saldrá de cobertura; podrás reactivarlo cuando confirme."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-[13px]" onClick={() => setToggleTarget(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={activar
                ? "bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
                : "bg-destructive text-white hover:bg-destructive/90 text-[13px]"}
              onClick={() => {
                if (objetivo) onToggleActivo?.(objetivo);
                setToggleTarget(null);
              }}
            >
              {activar ? "Activar" : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
