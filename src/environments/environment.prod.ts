import { NexacoreEnvironment } from '@nexacore/platform';

/**
 * Production is served same-origin (see Dockerfile/nginx.conf) — no separate
 * backend host, so backendOrigin stays empty and every request is relative.
 */
export const environment: NexacoreEnvironment = {
  production: true,
  backendOrigin: '',
  loginUrl: '/api/v1/auth',
  apiBaseUrl: '/api/v1',
  clientCode: 'SYSTEM_ADMIN_WEB',
  apiKey: '',
};
