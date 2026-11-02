import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import RefrigeradoresExplorerPage from './RefrigeradoresExplorerPage'
import { CajasTab } from '../components/CajasTab'
import { MuestrasTab } from '../components/MuestrasTab'
import { CargaMasivaMuestrasTab } from '../components/CargaMasivaMuestrasTab'
import { PrestamosTab } from '../components/PrestamosTab'
import { ColaboradoresTab } from '../components/ColaboradoresTab'
import { EntregasTab } from '../components/EntregasTab'
import { ProtocolosTab } from '../components/ProtocolosTab'
import { ProcesarTab } from '../components/ProcesarTab'
import { TipoEstudioMuestraAdminTab } from '../components/TipoEstudioMuestraAdminTab'

const sectionOrder: Array<{ path: string; permiso: string }> = [
  { path: 'muestras', permiso: 'MUESTRAS_VER' },
  { path: 'procesar', permiso: 'MUESTRAS_CREAR' },
  { path: 'refrigeradores', permiso: 'REFRIGERADORES_ACCEDER' },
  { path: 'cajas', permiso: 'CAJAS_ACCEDER' },
  { path: 'prestamos', permiso: 'TRASLADOS_ACCEDER' },
  { path: 'entregas', permiso: 'ENTREGAS_ACCEDER' },
  { path: 'protocolos', permiso: 'PROTOCOLOS_ACCEDER' },
  { path: 'est-muestras', permiso: 'ESTUDIOS_MUESTRA_ACCEDER' },
  { path: 'colaboradores', permiso: 'COLABORADORES_ACCEDER' },
  { path: 'carga-masiva', permiso: 'MUESTRAS_CARGA_MASIVA' },
]

function BiobancoRedirect() {
  const { hasPermiso } = useAuthStore()
  const first = sectionOrder.find(s => hasPermiso(s.permiso))
  return <Navigate to={first ? `/biobanco/${first.path}` : '/unauthorized'} replace />
}

export default function BiobancoPage() {
  return (
    <Routes>
      <Route index element={<BiobancoRedirect />} />
      <Route path="muestras" element={<MuestrasTab />} />
      <Route path="procesar" element={<ProcesarTab />} />
      <Route path="refrigeradores" element={<RefrigeradoresExplorerPage />} />
      <Route path="cajas" element={<CajasTab />} />
      <Route path="prestamos" element={<PrestamosTab />} />
      <Route path="entregas" element={<EntregasTab />} />
      <Route path="protocolos" element={<ProtocolosTab />} />
      <Route path="est-muestras" element={<TipoEstudioMuestraAdminTab />} />
      <Route path="colaboradores" element={<ColaboradoresTab />} />
      <Route path="carga-masiva" element={<CargaMasivaMuestrasTab />} />
      <Route path="*" element={<BiobancoRedirect />} />
    </Routes>
  )
}
