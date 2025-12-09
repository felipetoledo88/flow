import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { NewLoader } from '../ui/new-loader';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initializeAuth, isLoading } = useAuth();

  useEffect(() => {
    // Inicializa a autenticação uma vez quando a aplicação carrega
    initializeAuth();
  }, [initializeAuth]);

  // Mostra loading apenas na inicialização
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <NewLoader
          message="Inicializando sistema..."
          submessage="Carregando configurações"
          size="lg"
          color="red"
          variant="pulse"
        />
      </div>
    );
  }

  return <>{children}</>;
};
