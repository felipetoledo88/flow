import { create } from 'zustand';
import { AuthState, User, LoginCredentials, RegisterCredentials } from '../../types/auth';
import AuthService from '../../services/api/auth.service';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  initializeAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  login: async (credentials: LoginCredentials) => {
    try {
      set({ isLoading: true });
      const response = await AuthService.login(credentials);
      
      AuthService.setAuthData(response.access_token, response.user);
      
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (credentials: RegisterCredentials) => {
    try {
      set({ isLoading: true });
      const response = await AuthService.register(credentials);
      
      AuthService.setAuthData(response.access_token, response.user);
      
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await AuthService.logout();
    } catch (error) {
      // Ignora erros no logout, sempre limpa os dados locais
    } finally {
      AuthService.clearAuthData();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  refreshToken: async () => {
    try {
      const { token } = get();
      if (!token) return;

      const response = await AuthService.refreshToken();
      const { user } = AuthService.getAuthData();
      
      if (user) {
        AuthService.setAuthData(response.access_token, user);
        set({
          token: response.access_token,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      // Se falhar ao renovar o token, faz logout
      get().logout();
    }
  },

  initializeAuth: () => {
    set({ isLoading: true });
    
    try {
      const { token, user } = AuthService.getAuthData();
      
      if (token && user && AuthService.isTokenValid(token)) {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Se o token for inválido, limpa os dados
        AuthService.clearAuthData();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      AuthService.clearAuthData();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
