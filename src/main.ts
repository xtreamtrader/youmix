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
import { sentryConfig } from './config/sentry.config';
import { RolesGuard } from './common/guards/roles.guard';
import {
  ReXUWSAdapter,
  IReXUWSNestApplication,
} from 'rexuws-nestjs-http-adapter';
import { middlewares, getLoggerInstance } from 'rexuws';

const serverConfig = config.get('server');

async function bootstrap() {
  const logger = new Logger('BOOTSTRAPTING');
  const app = await NestFactory.create<IReXUWSNestApplication>(
    AppModule,
    new ReXUWSAdapter(),
  );
  const reflector = app.get<Reflector>(Reflector);

  app.use(middlewares.httpLogger(getLoggerInstance()));

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

  app.useGlobalGuards(new RolesGuard(reflector));

  // app.useGlobalInterceptors(new SentryInterceptor());

  app.setGlobalPrefix(serverConfig.prefix);

  Sentry.init(sentryConfig);
  const port = process.env.PORT || serverConfig.port;
  await app.listen(3000);
  logger.log(`Listening on ${port}`);
}

// if (cluster.isMaster) {
//   for (let i = 0; i < 4; i++) cluster.fork();
// } else
bootstrap();
