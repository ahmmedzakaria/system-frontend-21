import { ActionTypes, ApiEndpoint } from '@nexacore/platform';

// Login/session/privilege-context endpoints are already self-contained inside
// @nexacore/platform's AuthService/ApplicationContextService — do not
// redeclare them here. This file only holds endpoints specific to this app's
// own pages (Access Control, Privilege, Layout, License), added module by
// module as each phase is implemented.
export const ApiEndpoints = {} satisfies Record<string, ApiEndpoint>;
