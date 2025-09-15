// api/index.ts
import 'reflect-metadata';
import express from 'express';
import serverless from 'serverless-http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { RequestMethod } from '@nestjs/common';

// Bootstrap una sola vez al cargar el módulo
const bootstrap = (async () => {
  const server = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: false,
  });

  // Prefijo global para tus rutas de API, manteniendo / y /health libres
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: '/health', method: RequestMethod.GET },
    ],
  });

  await app.init(); // NUNCA app.listen() en Vercel
  return serverless(server);
})();

export default async function handler(req: any, res: any) {
  try {
    const h = await bootstrap;     // espera la inicialización
    return h(req, res);            // delega la request
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
