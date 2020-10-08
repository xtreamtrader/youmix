import { JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import * as config from 'config';

const jwtGlobalConfig = config.get('jwt');

export const jwtConfig: JwtModuleOptions = {
  secret: process.env.JWT_SECRET || jwtGlobalConfig.secret,
  signOptions: {
    expiresIn: process.env.JWT_EXPIRES_IN || jwtGlobalConfig.expiresIn,
  },
};

export const refreshTokenConfig: JwtSignOptions = {
  secret:
    process.env.JWT_REFRESH_TOKEN_SECRET || jwtGlobalConfig.refreshTokenSecret,
  expiresIn:
    process.env.JWT_REFRESH_TOKEN_EXPIRES_IN ||
    jwtGlobalConfig.refreshTokenExpiresIn,
};
