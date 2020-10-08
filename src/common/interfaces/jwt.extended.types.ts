import { EAccountRole } from './account-role.interface';

export interface IJwtUser {
  id: string;
  role: EAccountRole;
  username: string;
  iat?: number;
  exp?: number;
}

export interface ITokenResult {
  accessToken: string;
  refreshToken?: string;
}

export enum ETokenStatus {
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  ACCESS_TOKEN_EXPIRED = 'ACCESS_TOKEN_EXPIRED',
}
