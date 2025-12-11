import { api } from './index';
import { ReportsFilters, ReportsOverview } from '@/types/reports';

export class ReportsService {
  static async getOverview(filters: ReportsFilters): Promise<ReportsOverview> {
    const response = await api.get<ReportsOverview>('/reports/overview', {
      params: filters,
    });
    return response.data;
  }
}

export default ReportsService;
