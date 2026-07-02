import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** @deprecated Use requiredPermiso instead */
  requiredRoles?: UserRole[];
  requiredPermiso?: string;
}

export function ProtectedRoute({ children, requiredRoles, requiredPermiso }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading, hasRole, hasPermiso, mustChangePassword } = useAuthStore();
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
    if (!hasPermiso(requiredPermiso)) {
      return <Navigate to="/unauthorized" replace />;
    }
  } else if (requiredRoles && requiredRoles.length > 0) {
    if (!hasRole(requiredRoles as UserRole[])) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
