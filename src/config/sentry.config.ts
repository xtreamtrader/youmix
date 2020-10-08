import * as config from 'config';
import { NodeOptions } from '@sentry/node';

const sentryGlobalConfig = config.get('sentry');

export const sentryConfig: NodeOptions = {
  dsn: process.env.SENTRY_DSN || sentryGlobalConfig.dsn,
  tracesSampleRate: sentryGlobalConfig.tracesSampleRate,
};
