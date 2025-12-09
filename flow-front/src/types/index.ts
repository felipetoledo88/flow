
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'director' | 'client';
  avatar?: string;
  company?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'planning';
  health: 'healthy' | 'warning' | 'critical';
  reliability: number; // percentage
  reworkRate: number; // percentage
  startDate: string;
  endDate?: string;
  teamSize: number;
  clientId: string;
  directorId: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  storyPoints: number;
  completedPoints: number;
  velocity: number;
}

export interface Metric {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'healthy' | 'warning' | 'critical';
  tooltip?: string;
  additionalInfo?: string;
  customStatus?: 'on-time' | 'overdue'; // Para métricas com lógica de cores específica
}

export interface ChartData {
  label: string;
  value: number;
  date?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  agentType?: string;
  timestamp: string;
  attachments?: File[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  isActive: boolean;
  avatar?: string;
  color?: string;
}
