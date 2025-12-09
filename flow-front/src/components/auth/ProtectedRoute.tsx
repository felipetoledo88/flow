import { Navigate } from 'react-router-dom';
import { AuthService } from '@/services/api/auth.service';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array< 'admin' | 'user' | 'manager' | 'techlead' | 'client' | 'qa'>;
  clientAllowedPaths?: string[];
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  clientAllowedPaths = ['/dashboard', '/chat', '/schedules']
}: ProtectedRouteProps) => {
  const { user } = AuthService.getAuthData();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se o usuário é um cliente, verificar se está em uma rota permitida
  if (user.role === 'client') {
    const currentPath = window.location.pathname;
    const isAllowed = clientAllowedPaths.some(path => currentPath.startsWith(path));
    
    if (!isAllowed) {
      // Redirecionar clientes para o Projetos se tentarem acessar outras páginas
      return <Navigate to="/projects" replace />;
    }
  }

  // Se há roles específicas permitidas e o usuário não tem uma delas, redirecionar
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Se é um cliente tentando acessar rota restrita, vai para Projetos
    if (user.role === 'client') {
      return <Navigate to="/projects" replace />;
    }
    // Para outros roles, também vai para Projetos
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
};