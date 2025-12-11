import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsFilterDto } from './dto/reports-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  async getOverview(@Query() filters: ReportsFilterDto) {
    return this.reportsService.getOverview(filters);
  }

  @Get('daily-hours')
  async getDailyHours(@Query() filters: ReportsFilterDto) {
    return this.reportsService.getDailyHoursReport(filters);
  }

  @Get('my-daily-hours')
  async getMyDailyHours(@CurrentUser() user: { id: number }) {
    return this.reportsService.getMyDailyHoursReport(user.id);
  }
}
