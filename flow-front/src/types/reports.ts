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
  tasks: {
    total: number;
    completed: number;
    overdue: number;
  };
}
