import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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

  /* Stripe webhook middleware
   * Stripe envoie les webhooks avec une signature cryptée.
   * Pour vérifier cette signature, Stripe doit recevoir le BODY EXACT brut.
   *
   * Problème :
   * NestJS transforme automatiquement le JSON -> la signature devient invalide
   *
   * Donc :
   * On désactive le parsing JSON UNIQUEMENT pour cette route.
   */
  app.use(
    '/api/v1/payments/webhooks/stripe',
    bodyParser.raw({ type: 'application/json' }),
  );

  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();