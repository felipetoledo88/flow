import axios from 'axios';
import {
  Team,
  CreateTeamDto,
  UpdateTeamDto,
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
  TeamMember,
} from '../../types/team';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || '';

      if (errorMessage === 'Invalid credentials' ||
          errorMessage.includes('validation') ||
          errorMessage.includes('Unauthorized')) {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class TeamsService {
  static async getTeams(): Promise<Team[]> {
    const response = await api.get<Team[]>('/teams');
    return response.data;
  }

  static async getTeam(id: number): Promise<Team> {
    const response = await api.get<Team>(`/teams/${id}`);
    return response.data;
  }

  static async createTeam(data: CreateTeamDto): Promise<Team> {
    const response = await api.post<Team>('/teams', data);
    return response.data;
  }

  static async updateTeam(id: number, data: UpdateTeamDto): Promise<Team> {
    const response = await api.patch<Team>(`/teams/${id}`, data);
    return response.data;
  }

  static async deleteTeam(id: number): Promise<void> {
    await api.delete(`/teams/${id}`);
  }

  static async addMember(teamId: number, data: CreateTeamMemberDto): Promise<TeamMember> {
    const response = await api.post<TeamMember>(`/teams/${teamId}/members`, data);
    return response.data;
  }

  static async updateMember(
    teamId: number,
    memberId: number,
    data: UpdateTeamMemberDto
  ): Promise<TeamMember> {
    const response = await api.patch<TeamMember>(
      `/teams/${teamId}/members/${memberId}`,
      data
    );
    return response.data;
  }

  static async removeMember(teamId: number, memberId: number): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${memberId}`);
  }
}

export default TeamsService;
