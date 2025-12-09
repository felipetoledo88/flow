import { api } from './index';
import {
  Team,
  CreateTeamDto,
  UpdateTeamDto,
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
  TeamMember,
} from '../../types/team';

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
