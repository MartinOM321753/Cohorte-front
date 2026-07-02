import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
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
import { getFullName } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { Paciente } from "@/types/api";

interface PacientesTableProps {
  data: Paciente[];
  isLoading?: boolean;
  incluirJerarquia?: boolean;
  onRowClick: (paciente: Paciente) => void;
  onEdit: (paciente: Paciente) => void;
  onToggleActivo: (paciente: Paciente) => void;
  onSchedule: (paciente: Paciente) => void;
  onCrearAcceso: (paciente: Paciente) => void;
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
  manualPagination,
  pagination,
  onPaginationChange,
  pageCount,
  totalElements,
}: PacientesTableProps) {
  const navigate = useNavigate();
  const hasPermiso = useAuthStore((s) => s.hasPermiso);

  const columns: ColumnDef<Paciente>[] = [
    {
      id: "nombre",
      header: "Participante",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <p className="text-[13px] font-medium text-[var(--imss-ink-900)]">
              {getFullName(p.persona)}
            </p>
            <p className="text-[11px] text-[var(--imss-ink-300)]">
              Folio: {p.folio}
            </p>
          </div>
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
      cell: ({ row }) =>
        row.original.activo ? (
          <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-danger-fg)]">
            Inactivo
          </span>
        ),
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
                  Ver expediente 360
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(p);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onSchedule(p);
                  }}
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Agendar cita
                </DropdownMenuItem>

                {showCrearAcceso && (
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

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActivo(p);
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
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
      onRowClick={onRowClick}
    />
  );
}
