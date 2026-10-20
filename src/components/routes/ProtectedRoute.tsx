import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Un permiso único (compat) o array — cualquiera del array otorga acceso. */
  requiredPermiso?: string | string[];
  /**
   * La pantalla es del participante: hace falta tener expediente, no solo el permiso.
   *
   * `CUESTIONARIOS_AUTOCONTESTAR` lo tienen también ROOT y ADMINISTRADOR, y para ellos
   * la pantalla no tiene de dónde sacar «sus» cuestionarios. Se esconde del menú, pero
   * la dirección se puede escribir a mano y entonces hay que mandarlos a otro sitio.
   */
  soloParticipantes?: boolean;
}

export function ProtectedRoute({ children, requiredPermiso, soloParticipantes }: ProtectedRouteProps) {
  const {
    isAuthenticated, user, isLoading, hasPermiso, mustChangePassword, esParticipante,
  } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && location.pathname !== '/cambiar-contrasena') {
    return <Navigate to="/cambiar-contrasena" replace />;
  }

  if (requiredPermiso) {
    const codes = Array.isArray(requiredPermiso) ? requiredPermiso : [requiredPermiso];
    const autorizado = codes.some((c) => hasPermiso(c));
    if (!autorizado) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (soloParticipantes && !esParticipante) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
