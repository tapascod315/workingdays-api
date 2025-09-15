import { Module } from '@nestjs/common';
import { DatesController } from './dates.controller';
import { BusinessTimeService } from './services/business-time.service';
import { HolidaysService } from './services/holidays.service';

@Module({
  controllers: [DatesController],
  providers: [BusinessTimeService, HolidaysService],
})
export class DatesModule {}
