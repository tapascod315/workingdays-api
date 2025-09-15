import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from './app.module';

let cachedServer: ReturnType<typeof serverlessExpress> | null = null;

async function bootstrapServer() {
  const app: Express = express();
  const nest = await NestFactory.create(AppModule, new ExpressAdapter(app), { logger: false });
  // activa aquí pipes/filters si los usas en main.ts
  await nest.init();
  return serverlessExpress({ app });
}

export const handler = async (event: any, context: any) => {
  if (!cachedServer) cachedServer = await bootstrapServer();
  return cachedServer(event, context);
};
