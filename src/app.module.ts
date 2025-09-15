import { Module } from '@nestjs/common';
import { DatesModule } from './dates/dates.module';
import { AppController } from './app.controller';

@Module({
  imports: [DatesModule],
  controllers: [AppController],
})
export class AppModule {}


