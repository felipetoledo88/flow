import { api } from './index';
import { ReportsFilters, ReportsOverview, DailyHoursReport } from '@/types/reports';

export class ReportsService {
  static async getOverview(filters: ReportsFilters): Promise<ReportsOverview> {
    const response = await api.get<ReportsOverview>('/reports/overview', {
      params: filters,
      paramsSerializer: {
        indexes: null,
      },
    });
    return response.data;
  }

  static async getDailyHours(filters: ReportsFilters): Promise<DailyHoursReport> {
    const response = await api.get<DailyHoursReport>('/reports/daily-hours', {
      params: filters,
      paramsSerializer: {
        indexes: null,
      },
    });
    return response.data;
  }

  static async getMyDailyHours(): Promise<DailyHoursReport> {
    const response = await api.get<DailyHoursReport>('/reports/my-daily-hours');
    return response.data;
  }
}

export default ReportsService;
