export interface ReportsFilters {
  startDate?: string;
  endDate?: string;
  projectId?: number;
  teamId?: number;
  assigneeId?: number;
}

export interface HoursGroup {
  projectId?: number | null;
  projectName?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
  hours: number;
}

export interface DelayGroup {
  teamId?: number | null;
  teamName?: string | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
  delayed: number;
  onTime: number;
  total: number;
}

export interface ReportsOverview {
  filters: ReportsFilters;
  hours: {
    total: number;
    byProject: HoursGroup[];
    byTeam: HoursGroup[];
    byAssignee: HoursGroup[];
  };
  delays: {
    byTeam: DelayGroup[];
    byAssignee: DelayGroup[];
  };
  tasksByAssignee?: Record<string, { assigneeName: string; totalHours: number; tasks: TaskHoursItem[] }>;
  tasksByTeam?: Record<string, { teamName: string; totalHours: number; tasks: TaskHoursItem[] }>;
  tasks: {
    total: number;
    completed: number;
    overdue: number;
  };
}

export interface TaskHoursItem {
  id: number;
  title: string;
  status: string;
  estimatedHours: number;
  actualHours: number;
  assigneeName?: string | null;
  teamName?: string | null;
  endDate?: string | null;
}
