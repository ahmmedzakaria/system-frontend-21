import { NexacoreEnvironment } from '@nexacore/platform';

export const environment: NexacoreEnvironment = {
  backendOrigin: 'http://localhost:9100',
  // Every backend route lives under /api/v1, including auth — see
  // ../../../frontend-libs-21/projects/api-common/src/lib/environment.ts.
  loginUrl: '/api/v1/auth',
  apiBaseUrl: '/api/v1',
  clientCode: 'SYSTEM_ADMIN_WEB',
  apiKey: '',
};
