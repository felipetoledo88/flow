import { useState, useCallback, useEffect } from 'react';

interface LoaderState {
  isVisible: boolean;
  message?: string;
  submessage?: string;
  progress?: number;
  variant?: 'default' | 'pulse' | 'flow' | 'particles' | 'gradient' | 'skeleton';
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo';
  icon?: 'default' | 'brain' | 'target' | 'chart' | 'users' | 'settings' | 'folder' | 'sparkles';
}

interface LoaderOptions extends Omit<LoaderState, 'isVisible'> {
  duration?: number; // Auto hide after duration (ms)
  onComplete?: () => void;
}

export const useModernLoader = (initialState: Partial<LoaderState> = {}) => {
  const [loaderState, setLoaderState] = useState<LoaderState>({
    isVisible: false,
    message: 'Carregando...',
    variant: 'flow',
    color: 'blue',
    icon: 'default',
    ...initialState
  });

  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Show loader with options
  const showLoader = useCallback((options: LoaderOptions = {}) => {
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    setLoaderState(prev => ({
      ...prev,
      isVisible: true,
      ...options
    }));

    // Auto hide after duration
    if (options.duration) {
      const newTimeoutId = setTimeout(() => {
        hideLoader();
        options.onComplete?.();
      }, options.duration);
      setTimeoutId(newTimeoutId);
    }
  }, [timeoutId]);

  // Hide loader
  const hideLoader = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setLoaderState(prev => ({ ...prev, isVisible: false }));
  }, [timeoutId]);

  // Update loader state
  const updateLoader = useCallback((updates: Partial<LoaderState>) => {
    setLoaderState(prev => ({ ...prev, ...updates }));
  }, []);

  // Update progress
  const updateProgress = useCallback((progress: number) => {
    setLoaderState(prev => ({ ...prev, progress: Math.max(0, Math.min(100, progress)) }));
  }, []);

  // Update message
  const updateMessage = useCallback((message: string, submessage?: string) => {
    setLoaderState(prev => ({ ...prev, message, submessage }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Preset configurations
  const presets = {
    // System loading
    system: () => showLoader({
      variant: 'flow',
      color: 'blue',
      icon: 'sparkles',
      message: 'Carregando sistema...',
      submessage: 'Inicializando componentes'
    }),

    // Dashboard loading
    dashboard: () => showLoader({
      variant: 'flow',
      color: 'purple',
      icon: 'chart',
      message: 'Carregando dashboard...',
      submessage: 'Buscando dados analíticos'
    }),

    // Projects loading
    projects: () => showLoader({
      variant: 'particles',
      color: 'green',
      icon: 'folder',
      message: 'Carregando projetos...',
      submessage: 'Sincronizando com repositórios'
    }),

    // User data loading
    users: () => showLoader({
      variant: 'gradient',
      color: 'orange',
      icon: 'users',
      message: 'Carregando usuários...',
      submessage: 'Validando permissões'
    }),

    // Settings loading
    settings: () => showLoader({
      variant: 'pulse',
      color: 'indigo',
      icon: 'settings',
      message: 'Aplicando configurações...',
      submessage: 'Salvando preferências'
    }),

    // Data processing
    processing: () => showLoader({
      variant: 'flow',
      color: 'pink',
      icon: 'brain',
      message: 'Processando dados...',
      submessage: 'Analisando informações'
    }),

    // Save operation
    saving: () => showLoader({
      variant: 'pulse',
      color: 'green',
      icon: 'default',
      message: 'Salvando...',
      submessage: 'Aguarde um momento'
    }),

    // Delete operation
    deleting: () => showLoader({
      variant: 'gradient',
      color: 'orange',
      icon: 'default',
      message: 'Removendo...',
      submessage: 'Processando solicitação'
    }),

    // Page transition
    pageTransition: () => showLoader({
      variant: 'flow',
      color: 'blue',
      icon: 'sparkles',
      message: 'Navegando...',
      duration: 1000
    }),

    // Quick loading (skeleton)
    skeleton: () => showLoader({
      variant: 'skeleton',
      color: 'blue',
      message: undefined,
      submessage: undefined
    })
  };

  return {
    ...loaderState,
    showLoader,
    hideLoader,
    updateLoader,
    updateProgress,
    updateMessage,
    presets
  };
};

// Hook for component-level loading
export const useComponentLoader = (autoShow = false) => {
  const loader = useModernLoader();
  
  useEffect(() => {
    if (autoShow) {
      loader.showLoader();
    }
  }, [autoShow]);

  return loader;
};

// Hook for async operations with automatic loading
export const useAsyncWithLoader = () => {
  const loader = useModernLoader();

  const executeWithLoader = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: LoaderOptions = {}
  ): Promise<T> => {
    try {
      loader.showLoader(options);
      const result = await asyncFn();
      return result;
    } catch (error) {
      throw error;
    } finally {
      loader.hideLoader();
    }
  }, [loader]);

  return {
    ...loader,
    executeWithLoader
  };
};