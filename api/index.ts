import 'reflect-metadata';
import express from 'express';
import serverless from 'serverless-http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { RequestMethod } from '@nestjs/common';

let cachedHandler: any;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedHandler) {
      const server = express();

      const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
        logger: false,
      });

      // Prefijo global /api (para que tu /dates quede en /api/dates)
      app.setGlobalPrefix('api', {
        exclude: [
          { path: '/', method: RequestMethod.GET },
          { path: '/health', method: RequestMethod.GET },
        ],
      });

      await app.init();
      cachedHandler = serverless(server);
    }

    // IMPORTANTE: retorna la promesa de la función serverless
    return cachedHandler(req, res);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
