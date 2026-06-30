import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CalendarPlus,
  Eye,
  FileText,
  Pencil,
  UserCheck,
  UserX,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { getFullName } from "@/lib/utils";
import type { Paciente } from "@/types/api";

interface PacientesTableProps {
  data: Paciente[];
  isLoading?: boolean;
  incluirJerarquia?: boolean;
  onView: (paciente: Paciente) => void;
  onEdit: (paciente: Paciente) => void;
  onToggleActivo: (paciente: Paciente) => void;
  onSchedule: (paciente: Paciente) => void;
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
  onView,
  onEdit,
  onToggleActivo,
  onSchedule,
  manualPagination,
  pagination,
  onPaginationChange,
  pageCount,
  totalElements,
}: PacientesTableProps) {
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
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {/* Expediente 360 — UUID pasa por state, nunca por URL */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--imss-ink-300)] hover:text-[var(--imss-ink-900)]"
            title="Ver detalle rápido"
            onClick={() => onView(row.original)}
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--imss-ink-300)] hover:text-[var(--imss-ink-900)]"
            title="Editar participante"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
          <Link
            to="/pacientes/expediente"
            state={{ uuid: row.original.uuid }}
            title="Ver expediente 360"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-green-700)] hover:bg-[var(--imss-green-50)]"
          >
            <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--imss-ink-300)] hover:text-[var(--imss-green-700)]"
            title="Agendar cita"
            onClick={() => onSchedule(row.original)}
          >
            <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={[
              "h-7 w-7",
              row.original.activo
                ? "text-[var(--imss-ink-300)] hover:text-[var(--status-danger-fg)]"
                : "text-[var(--imss-ink-300)] hover:text-[var(--status-success-fg)]",
            ].join(" ")}
            title={
              row.original.activo
                ? "Desactivar participante"
                : "Activar participante"
            }
            onClick={() => onToggleActivo(row.original)}
          >
            {row.original.activo ? (
              <UserX className="h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
          </Button>
        </div>
      ),
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
    />
  );
}
