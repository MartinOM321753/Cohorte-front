import { Paciente, PacienteRequestDTO } from '@/types/api'

export type { Paciente, PacienteRequestDTO }

export interface PacienteTableRow extends Paciente {
  nombreCompleto: string
}

export interface PacienteFilterOptions {
  searchTerm: string
  estado: 'todos' | 'activos' | 'inactivos'
  sortBy: 'nombre' | 'folio' | 'fechaRegistro'
}
