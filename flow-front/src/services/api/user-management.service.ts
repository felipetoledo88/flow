import { 
  User, 
  CreateUserDto, 
  UpdateUserDto, 
  UserFilters, 
  UserResponse,
  Project 
} from '@/types/user-management';
import { apiClient } from './auth.service';

class UserManagementService {

  async getUsers(filters?: UserFilters): Promise<UserResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.role) queryParams.append('role', filters.role);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const response = await apiClient.get<UserResponse>(`/users?${queryParams.toString()}`);
    return response.data;
  }

  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  }

  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await apiClient.delete(`/users/${id}`);
    } catch (error: any) {
      // Extrair mensagem de erro específica do backend
      const message = error?.response?.data?.message || error?.message || 'Erro ao deletar usuário';
      throw new Error(message);
    }
  }

  async changeUserStatus(id: number, status: User['status']): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}/status`, { status });
    return response.data;
  }

  async changeUserRole(id: number, role: User['role']): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}/role`, { role });
    return response.data;
  }

  async resetUserPassword(id: number, password: string): Promise<void> {
    await apiClient.put(`/users/${id}/password`, { password });
  }

  async getAvailableProjects(): Promise<Project[]> {
    const response = await apiClient.get<Project[]>('/users/available-projects');
    return response.data;
  }

  async linkUserToProjects(userId: number, projectIds: string[]): Promise<void> {
    await apiClient.put(`/users/${userId}/projects`, { projectIds });
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    const response = await apiClient.get<Project[]>(`/users/${userId}/projects`);
    return response.data;
  }

  async getManagers(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/users/managers');
    return response.data;
  }
}

export const userManagementService = new UserManagementService();
export default UserManagementService;