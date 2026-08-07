import { ActionTypes, ApiEndpoint } from '@nexacore/platform';

// Login/session/privilege-context endpoints are already self-contained inside
// @nexacore/platform's AuthService/ApplicationContextService — do not
// redeclare them here. This file only holds endpoints specific to this app's
// own pages (Access Control, Privilege, Layout, License), added module by
// module as each phase is implemented.
export const ApiEndpoints = {
    // Access Control — Client Applications
    CLIENT_APP_SAVE: { apiPath: 'system/client-app/save', actionType: ActionTypes.CREATE },
    CLIENT_APP_LIST: { apiPath: 'system/client-app/list', actionType: ActionTypes.SEARCH },
    CLIENT_APP_ROTATE_API_KEY: { apiPath: 'system/client-app/rotate-api-key', actionType: ActionTypes.UPDATE },
    CLIENT_APP_ASSIGN_API_PERMISSIONS: { apiPath: 'system/client-app/assign-api-permissions', actionType: ActionTypes.UPDATE },
    CLIENT_APP_ASSIGN_FEATURE_PERMISSIONS: { apiPath: 'system/client-app/assign-feature-permissions', actionType: ActionTypes.UPDATE },
    CLIENT_APP_ASSIGN_TENANTS: { apiPath: 'system/client-app/assign-tenants', actionType: ActionTypes.UPDATE },

    // Access Control — API Registry
    API_REGISTRY_INVENTORY: { apiPath: 'system/api-registry/inventory', actionType: ActionTypes.SEARCH },
    API_REGISTRY_LIST: { apiPath: 'system/api-registry/list', actionType: ActionTypes.SEARCH },
    API_REGISTRY_SAVE: { apiPath: 'system/api-registry/save', actionType: ActionTypes.CREATE },
    API_REGISTRY_SYNC: { apiPath: 'system/api-registry/sync', actionType: ActionTypes.UPDATE },

    // Privilege — used read-only by Access Control's Feature Permissions picker
    // ahead of the full Privilege module (a later phase).
    PRIVILEGE_LIST: { apiPath: 'system/privilege/list', actionType: ActionTypes.SEARCH },
} satisfies Record<string, ApiEndpoint>;
