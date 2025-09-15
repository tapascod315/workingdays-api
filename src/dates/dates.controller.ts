import { Controller, Get, Query, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { BusinessTimeService } from './services/business-time.service';
import { HolidaysService } from './services/holidays.service';
import { ComputeQueryDto } from './dtos/compute-query.dto';

type SuccessResponse = { date: string };
type ErrorResponse = { error: 'InvalidParameters' | 'ServiceUnavailable'; message: string };

@Controller()
export class DatesController {
  constructor(
    private readonly businessTime: BusinessTimeService,
    private readonly holidays: HolidaysService,
  ) {}

  @Get('api/working-date')
  async getWorkingDate(@Query() q: ComputeQueryDto): Promise<SuccessResponse | ErrorResponse> {
    // al menos uno
    if (q.days == null && q.hours == null) {
      throw new BadRequestException({ error: 'InvalidParameters', message: 'Provide days and/or hours' });
    }
    // si llega date debe ser ISO8601 con Z
    if (q.date && !/Z$/i.test(q.date)) {
      throw new BadRequestException({ error: 'InvalidParameters', message: 'date must be UTC ISO8601 ending with Z' });
    }

    // Descargar festivos (cacheado)
    const holidays = await this.holidays.getHolidays().catch(() => null);
    if (!holidays) {
      throw new InternalServerErrorException({ error: 'ServiceUnavailable', message: 'Holidays source unavailable' });
    }

    try {
      const isoUtc = this.businessTime.compute({
        startUtcIso: q.date ?? null,
        days: q.days ?? 0,
        hours: q.hours ?? 0,
        holidays,
      });
      return { date: isoUtc };
    } catch (e: any) {
      if (e?.name === 'BadRequestError') {
        throw new BadRequestException({ error: 'InvalidParameters', message: e.message });
      }
      throw new InternalServerErrorException({ error: 'ServiceUnavailable', message: 'Unexpected error' });
    }
  }
}
