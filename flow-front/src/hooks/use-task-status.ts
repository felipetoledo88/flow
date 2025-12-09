import { useEffect, useState } from 'react';
import { TaskStatusEntity } from '@/types/schedule';
import { TaskStatusService } from '@/services/api/task-status.service';

export const useTaskStatus = (projectId?: number) => {
  const [statuses, setStatuses] = useState<TaskStatusEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await TaskStatusService.getAllFiltered(projectId);
        setStatuses(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatuses();

    // Listener para recarregar status quando um novo é criado
    const handleStatusCreated = () => {
      fetchStatuses();
    };

    window.addEventListener('taskStatusCreated', handleStatusCreated);

    return () => {
      window.removeEventListener('taskStatusCreated', handleStatusCreated);
    };
  }, [projectId]);

  /**
   * Encontra um status por código
   */
  const getStatusByCode = (code: string): TaskStatusEntity | undefined => {
    return statuses.find(s => s.code === code);
  };

  /**
   * Encontra um status por ID
   */
  const getStatusById = (id: number): TaskStatusEntity | undefined => {
    return statuses.find(s => s.id === id);
  };

  /**
   * Retorna o ID de um status baseado no código
   */
  const getStatusId = (code: string): number | undefined => {
    return getStatusByCode(code)?.id;
  };

  /**
   * Cria um novo status e atualiza a lista
   */
  const createStatus = async (name: string): Promise<TaskStatusEntity | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const newStatus = await TaskStatusService.create(name, projectId);
      
      // Atualiza a lista local
      setStatuses(prevStatuses => [...prevStatuses, newStatus]);
      
      // Dispara evento para notificar outros hooks
      window.dispatchEvent(new Event('taskStatusCreated'));
      
      return newStatus;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };


  /**
   * Exclui um status no banco de dados
   */
  const deleteStatus = async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      await TaskStatusService.delete(id);

      // Remove da lista local
      setStatuses(prevStatuses =>
        prevStatuses.filter(status => status.id !== id)
      );

      // Dispara evento para notificar outros hooks
      window.dispatchEvent(new Event('taskStatusDeleted'));

      return {
        success: true,
        message: 'Status excluído com sucesso.'
      };
    } catch (err) {
      setError(err as Error);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Erro desconhecido ao excluir status'
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Atualiza o nome de um status
   */
  const updateStatus = async (id: number, name: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedStatus = await TaskStatusService.update(id, { name });

      // Atualiza na lista local
      setStatuses(prevStatuses =>
        prevStatuses.map(status => status.id === id ? updatedStatus : status)
      );

      // Dispara evento para notificar outros hooks
      window.dispatchEvent(new Event('taskStatusUpdated'));

      return {
        success: true,
        message: 'Status atualizado com sucesso.'
      };
    } catch (err) {
      setError(err as Error);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Erro desconhecido ao atualizar status'
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Recarrega a lista de status
   */
  const refreshStatuses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await TaskStatusService.getAllFiltered(projectId);
      setStatuses(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    statuses,
    isLoading,
    error,
    getStatusByCode,
    getStatusById,
    getStatusId,
    createStatus,
    updateStatus,
    deleteStatus,
    refreshStatuses,
  };
};
