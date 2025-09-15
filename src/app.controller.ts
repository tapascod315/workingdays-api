import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'WorkingDays API',
      status: 'ok',
      version: '1.0.0',
      endpoints: ['/dates'],
    };
  }
}
