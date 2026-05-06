import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Middleware pour capturer le raw body des webhooks Stripe
  // IMPORTANT: Doit être appliqué avant express.json()
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.includes('/payments/webhooks/stripe')) {
      express.raw({ type: 'application/json', limit: '10mb' })(req, res, () => {
        if (Buffer.isBuffer(req.body)) {
          (req as any).rawBody = req.body;
          (req as any).body = JSON.parse(req.body.toString());
        }
        next();
      });
    } else {
      next();
    }
  });
  app.use(express.json());

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.enableCors({
    origin: config.get('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
