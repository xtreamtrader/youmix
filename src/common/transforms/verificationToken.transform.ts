import * as config from 'config';

const serverConfig = config.get('server');
// const clientConfig = config.get('client');

export const tokenToUrl = (userId: string, token: string) =>
  `http://localhost:3000/${serverConfig.prefix}/auth/verification/${userId}/${token}`;

export const tokenToResetPasswordUrl = (userId: string, token: string) =>
  `http://localhost:3000/${serverConfig.prefix}/auth/verification/recovery${userId}/${token}`;
