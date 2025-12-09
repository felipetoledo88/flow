import React, { createContext, useContext, ReactNode } from 'react';
import { ModernLoader, ModernLoaderProps } from '@/components/ui/modern-loader';
import { useModernLoader } from '@/hooks/useModernLoader';

interface LoaderContextType {
  showLoader: (options?: any) => void;
  hideLoader: () => void;
  updateLoader: (updates: any) => void;
  updateProgress: (progress: number) => void;
  updateMessage: (message: string, submessage?: string) => void;
  presets: any;
  isVisible: boolean;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

interface LoaderProviderProps {
  children: ReactNode;
}

export const LoaderProvider: React.FC<LoaderProviderProps> = ({ children }) => {
  const loader = useModernLoader();

  return (
    <LoaderContext.Provider value={loader}>
      {children}
      
      {/* Global Loader Overlay */}
      <ModernLoader
        isVisible={loader.isVisible}
        size="lg"
        variant={loader.variant}
        message={loader.message}
        submessage={loader.submessage}
        icon={loader.icon}
        color={loader.color}
        progress={loader.progress}
        overlay={true}
      />
    </LoaderContext.Provider>
  );
};

export const useGlobalLoader = (): LoaderContextType => {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useGlobalLoader must be used within a LoaderProvider');
  }
  return context;
};