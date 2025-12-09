import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from "../components/auth/LoginForm";
import { useAuth } from '../hooks/use-auth';
import { NewLoader } from '@/components/ui/new-loader';

const LoginPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = location.state?.from?.pathname || '/projects';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <NewLoader
          message="Carregando sistema..."
          submessage="Verificando autenticação"
          size="lg"
          color="red"
          variant="pulse"
        />
      </div>
    );
  }

  // Se já estiver autenticado, não mostra o formulário
  if (isAuthenticated) {
    return null;
  }

  return <LoginForm />;
};

export default LoginPage;