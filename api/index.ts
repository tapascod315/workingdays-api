// api/index.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';

// Cache para no recrear la app en cada invocación
let server: Express | null = null;

async function bootstrap(): Promise<Express> {
  const app = express();
  const adapter = new ExpressAdapter(app);
  const nest = await NestFactory.create(AppModule, adapter, { logger: false });
  // si usas ValidationPipe global en main.ts, puedes repetirlo aquí si deseas
  await nest.init();
  return app;
}

// Vercel Node Function (req, res)
export default async function handler(req: any, res: any) {
  if (!server) server = await bootstrap();
  return server(req, res);
}
