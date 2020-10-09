import * as config from 'config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const globalDbConfig = config.get('db');

const typeOrmConfig: TypeOrmModuleOptions = {
  type: globalDbConfig.type,
  host: process.env.DB_HOST || globalDbConfig.host,
  port: process.env.DB_PORT || globalDbConfig.port,
  username: process.env.DB_USERNAME || globalDbConfig.username,
  password: process.env.DB_PASSWORD || globalDbConfig.password,
  database: process.env.DB_DATABASE || globalDbConfig.database,
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  // synchronize: globalDbConfig.synchronize,
  namingStrategy: new SnakeNamingStrategy(),
  // logging: true,

  migrationsTableName: 'migration',

  migrations: ['src/migration/*.ts'],

  cli: {
    migrationsDir: 'src/migration',
  },
};

module.exports = typeOrmConfig;
