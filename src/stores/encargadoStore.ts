import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EncargadoState {
  selectedAlmacenId: number | null
  setSelectedAlmacen: (id: number) => void
  clearSelectedAlmacen: () => void
}

export const useEncargadoStore = create<EncargadoState>()(
  persist(
    (set) => ({
      selectedAlmacenId: null,
      setSelectedAlmacen: (id) => set({ selectedAlmacenId: id }),
      clearSelectedAlmacen: () => set({ selectedAlmacenId: null }),
    }),
    { name: 'encargado-nav' }
  )
)
