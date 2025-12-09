import { api } from './index';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '../../types/auth';

// Exportar api como apiClient para retrocompatibilidade
export const apiClient = api;

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  static async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  }

  static async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  }

  static async refreshToken(): Promise<{ access_token: string }> {
    const response = await api.post<{ access_token: string }>('/auth/refresh');
    return response.data;
  }

  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  static setAuthData(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  static getAuthData(): { token: string | null; user: User | null } {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    return { token, user };
  }

  static clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  static isTokenValid(token: string): boolean {
    try {
      if (!token || typeof token !== 'string') {
        return false;
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now();
      const expirationTime = payload.exp * 1000;
      
      // Adiciona margem de segurança de 5 minutos
      return expirationTime > (currentTime + 5 * 60 * 1000);
    } catch (error) {
      return false;
    }
  }
}

export default AuthService;
