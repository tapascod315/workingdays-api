import { Module } from '@nestjs/common';
import { DatesModule } from './dates/dates.module';

@Module({
  imports: [DatesModule],
})
export class AppModule {}

