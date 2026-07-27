import { useState } from "react";
import {
  Building2,
  CalendarDays,
  Search,
  Upload,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { useGetPacientesPaginados } from "../hooks/useGetPacientes";
import { useToggleActivoPaciente, useCrearAccesoPaciente } from "../hooks/useCreatePaciente";
import { useGetInstitucionesVisibles } from "@/features/instituciones/hooks/useInstituciones";
import { PacientesTable } from "../components/PacientesTable";
import { PacienteFormModal } from "../components/PacienteFormModal";
import { PacienteImportModal } from "../components/PacienteImportModal";
import { PacienteDetailDrawer } from "../components/PacienteDetailDrawer";
import { CitaIlamyEventForm } from "@/features/citas/components/CitaIlamyEventForm";
import { SomatometriaFormModal } from "@/features/somatometria/components/SomatometriaFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDebounce } from "@/hooks/useDebounce";
import type { Paciente } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";

const PAGE_SIZE = 10;

type EstadoFiltro = "todos" | "activos" | "inactivos";

const ESTADO_OPCIONES: { valor: EstadoFiltro; label: string }[] = [
  { valor: "activos", label: "Activos" },
  { valor: "inactivos", label: "Inactivos" },
  { valor: "todos", label: "Todos" },
];

export default function PacientesPage() {
  const [incluirJerarquia, setIncluirJerarquia] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activos");
  const [idInstitucionFiltro, setIdInstitucionFiltro] = useState<number | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm.trim(), 350);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const { data: institucionesVisibles } = useGetInstitucionesVisibles({
    enabled: incluirJerarquia,
  });

  const soloActivos =
    estadoFiltro === "todos" ? undefined : estadoFiltro === "activos";

  const { data, isLoading } = useGetPacientesPaginados({
    page: pagination.pageIndex,
    size: pagination.pageSize,
    buscar: debouncedSearch || undefined,
    incluirJerarquia,
    soloActivos,
    idInstitucionFiltro:
      incluirJerarquia && idInstitucionFiltro ? idInstitucionFiltro : undefined,
  });

  const pacientes = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const toggleActivoMutation = useToggleActivoPaciente();
  const crearAccesoMutation = useCrearAccesoPaciente();

  const hasPermiso = useAuthStore((s) => s.hasPermiso);
  const userUuid = useAuthStore((s) => s.user?.uuid) || '';
  const puedeCrearPaciente = hasPermiso("PACIENTES_CREAR");
  const puedeImportarPacientes = hasPermiso("PACIENTES_IMPORTAR");
  const puedeCrearCita = hasPermiso("CITAS_CREAR");
  const puedeEditarPaciente = hasPermiso("PACIENTES_EDITAR");
  const puedeCrearAcceso = hasPermiso("PACIENTES_CREAR_ACCESO");
  const puedeCrearSomatometria = hasPermiso("SOMATOMETRIA_CREAR");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pacienteToEdit, setPacienteToEdit] = useState<Paciente | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(
    null,
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCitaModalOpen, setIsCitaModalOpen] = useState(false);
  const [patientToSchedule, setPatientToSchedule] = useState<Paciente | null>(
    null,
  );
  const [isSomatometriaOpen, setIsSomatometriaOpen] = useState(false);
  const [patientForSoma, setPatientForSoma] = useState<Paciente | null>(null);

  function handleView(paciente: Paciente) {
    setSelectedPaciente(paciente);
    setIsDrawerOpen(true);
  }

  function handleEdit(paciente: Paciente) {
    setPacienteToEdit(paciente);
    setIsFormOpen(true);
  }

  function handleSchedule(paciente: Paciente) {
    setPatientToSchedule(paciente);
    setIsCitaModalOpen(true);
  }

  function handleSomatometria(paciente: Paciente) {
    setPatientForSoma(paciente);
    setIsSomatometriaOpen(true);
  }

  function handleFormClose(open: boolean) {
    setIsFormOpen(open);
    if (!open) setPacienteToEdit(null);
  }

  function handleOpenCreate() {
    setPacienteToEdit(null);
    setIsFormOpen(true);
  }

  function handleToggleJerarquia() {
    setIncluirJerarquia(!incluirJerarquia);
    setIdInstitucionFiltro(null);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  function handleEstadoFiltroChange(opcion: EstadoFiltro) {
    setEstadoFiltro(opcion);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  function handleInstitucionFiltroChange(value: string) {
    setIdInstitucionFiltro(value === "todas" ? null : Number(value));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Participantes"
        subtitle="Registro de participantes incluidos en la cohorte"
        actions={
          <>
            {puedeImportarPacientes && (
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(true)}
                className="gap-2 text-[13px] h-9"
              >
                <Upload className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Importar</span>
              </Button>
            )}
            {puedeCrearCita && (
              <Button
                variant="outline"
                onClick={() => setIsCitaModalOpen(true)}
                className="gap-2 text-[13px] h-9"
              >
                <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Agendar cita</span>
              </Button>
            )}
            {puedeCrearPaciente && (
              <Button
                onClick={handleOpenCreate}
                className="gap-2 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px] h-9"
              >
                <UserRoundPlus className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Registrar participante</span>
              </Button>
            )}
          </>
        }
      />

      {/* Búsqueda y filtros */}
      <div className="flex flex-col gap-3">
        {/* Fila 1: Búsqueda + contador */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-[340px]">
            <Search
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--imss-ink-300)]"
              strokeWidth={1.75}
            />
            <Input
              placeholder="Buscar por nombre, folio, CURP o correo..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 pl-8 text-[13px]"
            />
          </div>

          {!isLoading && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--imss-ink-300)]">
              <UserRound className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>
                {totalElements} participante{totalElements !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Fila 2: Filtros (wrap en mobile) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {ESTADO_OPCIONES.map((opcion) => (
              <Button
                key={opcion.valor}
                variant={estadoFiltro === opcion.valor ? "default" : "ghost"}
                size="sm"
                onClick={() => handleEstadoFiltroChange(opcion.valor)}
                className={[
                  "text-[12px] h-8 whitespace-nowrap",
                  estadoFiltro === opcion.valor
                    ? "bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]"
                    : "",
                ].join(" ")}
              >
                {opcion.label}
              </Button>
            ))}
          </div>
          <Button
            variant={incluirJerarquia ? "default" : "outline"}
            size="sm"
            onClick={handleToggleJerarquia}
            className={[
              "gap-1.5 text-[12px] h-9 whitespace-nowrap",
              incluirJerarquia
                ? "bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]"
                : "",
            ].join(" ")}
            title="Mostrar participantes de instituciones relacionadas"
          >
            <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Jerarquía
          </Button>

          {incluirJerarquia && (
            <Select
              value={
                idInstitucionFiltro ? String(idInstitucionFiltro) : "todas"
              }
              onValueChange={handleInstitucionFiltroChange}
            >
              <SelectTrigger className="h-9 text-[12px] w-full sm:w-[220px]">
                <SelectValue placeholder="Todas las instituciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las instituciones</SelectItem>
                {institucionesVisibles?.map((inst) => (
                  <SelectItem key={inst.id} value={String(inst.id)}>
                    {inst.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Tabla */}
      <PacientesTable
        data={pacientes}
        isLoading={isLoading}
        incluirJerarquia={incluirJerarquia}
        onRowClick={handleView}
        onEdit={puedeEditarPaciente ? handleEdit : undefined}
        onToggleActivo={
          puedeEditarPaciente
            ? (p) => {
                const uuid = p.uuid;
                if (uuid) toggleActivoMutation.mutate(uuid);
              }
            : undefined
        }
        onSchedule={puedeCrearCita ? handleSchedule : undefined}
        onSomatometria={puedeCrearSomatometria ? handleSomatometria : undefined}
        onCrearAcceso={
          puedeCrearAcceso ? (p) => crearAccesoMutation.mutate(p.uuid) : undefined
        }
        manualPagination
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={totalPages}
        totalElements={totalElements}
      />

      {/* Drawer detalle */}
      <PacienteDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        paciente={selectedPaciente}
        onEdit={puedeEditarPaciente ? handleEdit : undefined}
        onSchedule={puedeCrearCita ? handleSchedule : undefined}
        onSomatometria={puedeCrearSomatometria ? handleSomatometria : undefined}
      />

      {/* Modal crear / editar */}
      <PacienteFormModal
        open={isFormOpen}
        onOpenChange={handleFormClose}
        paciente={pacienteToEdit}
      />

      {/* Modal importar */}
      <PacienteImportModal open={isImportOpen} onOpenChange={setIsImportOpen} />

      {/* Modal agendar cita */}
      <CitaIlamyEventForm
        open={isCitaModalOpen}
        onClose={() => {
          setPatientToSchedule(null);
          setIsCitaModalOpen(false);
        }}
        initialPacienteUUID={patientToSchedule?.uuid || undefined}
      />

      {/* Modal somatometría */}
      {patientForSoma && (
        <SomatometriaFormModal
          open={isSomatometriaOpen}
          onOpenChange={(open) => {
            setIsSomatometriaOpen(open);
            if (!open) setPatientForSoma(null);
          }}
          pacienteUUID={patientForSoma.uuid}
          usuarioRegistraUUID={userUuid}
        />
      )}
    </div>
  );
}
