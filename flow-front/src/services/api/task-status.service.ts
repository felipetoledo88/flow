import { api } from './index';
import { TaskStatusEntity } from '@/types/schedule';

export class TaskStatusService {
  /**
   * Busca todos os status de tarefas disponíveis
   */
  static async getAll(projectId?: number): Promise<TaskStatusEntity[]> {
    const params = projectId ? { projectId } : {};
    const response = await api.get<TaskStatusEntity[]>('/task-status', { params });
    return response.data;
  }

  /**
   * Busca um status específico por ID
   */
  static async getById(id: number): Promise<TaskStatusEntity | null> {
    try {
      const statuses = await this.getAll();
      return statuses.find(s => s.id === id) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca um status específico por código
   */
  static async getByCode(code: string): Promise<TaskStatusEntity | null> {
    try {
      const statuses = await this.getAll();
      return statuses.find(s => s.code === code) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cria um novo status de tarefa
   */
  static async create(name: string, projectId?: number): Promise<TaskStatusEntity> {
    const response = await api.post<TaskStatusEntity>('/task-status', { name, projectId });
    return response.data;
  }

  /**
   * Atualiza um status de tarefa no banco de dados
   */
  static async update(id: number, data: { name?: string }): Promise<TaskStatusEntity> {
    const response = await api.patch<TaskStatusEntity>(`/task-status/${id}`, data);
    return response.data;
  }

  /**
   * Busca todos os status (sem filtros locais, já que agora a exclusão é real)
   */
  static async getAllFiltered(projectId?: number): Promise<TaskStatusEntity[]> {
    try {
      const statuses = await this.getAll(projectId);
      return statuses;
    } catch (error) {
      return [];
    }
  }

  /**
   * Verifica se um status pode ser excluído (não está sendo usado por tarefas)
   */
  static async canDelete(id: number): Promise<{ canDelete: boolean; taskCount?: number; message?: string }> {
    try {
      const response = await api.get(`/task-status/${id}/can-delete`);
      return response.data;
    } catch (error: any) {
      // Se o endpoint não existir, retorna que pode excluir
      if (error?.response?.status === 404) {
        return { canDelete: true };
      }
      
      // Para outros erros, assume que não pode excluir por segurança
      return { 
        canDelete: false, 
        message: 'Não foi possível verificar se o status pode ser excluído.' 
      };
    }
  }

  /**
   * Exclui um status de tarefa no banco de dados
   */
  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/task-status/${id}`);
    } catch (error: any) {
      // Se retorna 404, significa que o endpoint não foi encontrado
      if (error?.response?.status === 404) {
        throw new Error('O endpoint de exclusão de status não foi encontrado. Verifique se o backend foi atualizado.');
      }
      
      // Se retorna 400/409, pode ser devido a restrições de integridade
      if (error?.response?.status === 400 || error?.response?.status === 409) {
        const message = error?.response?.data?.message;
        if (message) {
          throw new Error(message);
        }
        throw new Error('Não foi possível excluir o status. Verifique se não há tarefas associadas.');
      }
      
      // Re-lança outros tipos de erro
      throw new Error(error?.response?.data?.message || 'Erro interno do servidor ao excluir status.');
    }
  }

  /**
   * Reordena os status de tarefas
   */
  static async reorder(reorderData: { statusId: number; newOrder: number }[]): Promise<void> {
    try {
      await api.patch('/task-status/reorder', reorderData);
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Erro ao reordenar status.');
    }
  }
}
