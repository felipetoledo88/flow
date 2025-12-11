export interface ReportsFilters {
  startDate?: string;
  endDate?: string;
  projectIds?: number[];
  teamIds?: number[];
  assigneeIds?: number[];
  statusCodes?: string[];
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

export interface DailyHoursEntry {
  date: string;
  dayOfWeek: number;
  dayName: string;
  expectedHours: number;
  loggedHours: number;
  isWorkDay: boolean;
  hasGap: boolean;
}

export interface AssigneeDailyHours {
  assigneeId: number;
  assigneeName: string;
  dailyWorkHours: number;
  workDays: number[];
  days: DailyHoursEntry[];
  totalExpected: number;
  totalLogged: number;
  completionPercentage: number;
}

export interface DailyHoursReport {
  assignees: AssigneeDailyHours[];
  summary: {
    totalExpected: number;
    totalLogged: number;
    completionPercentage: number;
    daysWithGaps: number;
    daysComplete: number;
  };
}
