import { useAuthStore } from '../stores/auth/auth.store';

export const useAuth = () => {
  return useAuthStore();
};
