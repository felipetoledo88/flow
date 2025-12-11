import axios from 'axios';

// Backend padrão roda na porta 5252 (ver main.ts). Permite sobrescrever via VITE_API_BASE_URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5252';

// Configuração base do axios compartilhada
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Só faz logout se for realmente um erro de autenticação
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';

      // Não faz logout apenas para erros de login/register
      const isLoginOrRegisterRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

      if (isLoginOrRegisterRequest) {
        // Erros de login/register não causam logout
        return Promise.reject(error);
      }

      // Para qualquer outro 401 (token expirado/inválido), desloga
      // Limpa dados e marca flag de sessão expirada
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem('sessionExpired', 'true');

      // Redireciona imediatamente para login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
