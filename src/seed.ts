import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as config from 'config';
import { SeedsService } from './seeds/seeds.service';
import { SeedsModule } from './seeds/seeds.module';

async function bootstrap() {
  NestFactory.createApplicationContext(SeedsModule)
    .then(appContext => {
      const logger = appContext.get(Logger);
      const seeder = appContext.get(SeedsService);
      if (process.argv[2] === '--up')
        seeder
          .up(1000)
          .then(() => {
            logger.debug('Seeding complete!');
          })
          .catch(error => {
            logger.error('Seeding failed!');
            throw error;
          })
          .finally(() => appContext.close());
      else if (process.argv[2] === '--down')
        seeder
          .down()
          .then(() => {
            logger.debug('Seeding complete!');
          })
          .catch(error => {
            logger.error('Seeding failed!');
            throw error;
          })
          .finally(() => appContext.close());

      // appContext.close();
    })
    .catch(error => {
      throw error;
    });
}

bootstrap();
