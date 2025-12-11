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

export interface DailyHoursReportDto {
  assignees: AssigneeDailyHours[];
  summary: {
    totalExpected: number;
    totalLogged: number;
    completionPercentage: number;
    daysWithGaps: number;
    daysComplete: number;
  };
}
