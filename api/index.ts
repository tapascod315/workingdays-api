import 'reflect-metadata';
import express from 'express';
import serverless from 'serverless-http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { RequestMethod } from '@nestjs/common';

console.log('[index] module loaded');

const bootstrap = (async () => {
  console.log('[index] bootstrap start');
  const server = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: false,
  });

  // Prefijo para API, dejando / y /health libres
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: '/health', method: RequestMethod.GET },
    ],
  });

  await app.init(); // NUNCA app.listen en Vercel
  console.log('[index] bootstrap done');
  return serverless(server);
})();

export default async function handler(req: any, res: any) {
  try {
    console.log('[index] request', req.method, req.url);
    const h = await bootstrap;
    return h(req, res); // <- importante: devolver la promesa
  } catch (e) {
    console.error('[index] error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
