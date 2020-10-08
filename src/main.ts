import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  Logger,
  ValidationPipe,
  BadRequestException,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import * as config from 'config';
import * as cluster from 'cluster';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';
import { sentryConfig } from './config/sentry.config';
import { RolesGuard } from './common/guards/roles.guard';
import { SeedsService } from './seeds/seeds.service';

const serverConfig = config.get('server');

async function bootstrap() {
  const logger = new Logger('BOOTSTRAPTING');
  const app = await NestFactory.create(AppModule);
  const reflector = app.get<Reflector>(Reflector);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: errors =>
        new BadRequestException({
          statusCode: 400,
          message: errors,
          error: 'Bad Request',
          type: 'VALIDATION_FAILED',
        }),
      forbidUnknownValues: true,
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // app.useGlobalGuards(new RolesGuard(reflector));

  // app.useGlobalInterceptors(new SentryInterceptor());

  app.setGlobalPrefix(serverConfig.prefix);

  Sentry.init(sentryConfig);
  const port = process.env.PORT || serverConfig.port;
  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on ${port}`);
}

// if (cluster.isMaster) {
//   for (let i = 0; i < 4; i++) cluster.fork();
// } else
bootstrap();
