// api/index.ts
import 'reflect-metadata';
import * as express from 'express';
import serverless from 'serverless-http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';

const expressApp = express();
let cachedHandler: any;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedHandler) {
      const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
        logger: false,
      });
      // (Opcional) prefijo global
      // app.setGlobalPrefix('api');
      await app.init();
      cachedHandler = serverless(expressApp);
    }
    return cachedHandler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
}
