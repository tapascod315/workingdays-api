// api/index.ts
import 'reflect-metadata';
import express from 'express';
import serverless from 'serverless-http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';

let cachedHandler: any;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedHandler) {
      const server = express();

      const nest = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
        { logger: false }
      );

      // (Opcional) Prefijo global, excluyendo raíz/health
      // import { RequestMethod } from '@nestjs/common';
      // nest.setGlobalPrefix('api', {
      //   exclude: [
      //     { path: '/', method: RequestMethod.GET },
      //     { path: '/health', method: RequestMethod.GET }
      //   ],
      // });

      await nest.init();
      cachedHandler = serverless(server);
    }
    return cachedHandler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
}

