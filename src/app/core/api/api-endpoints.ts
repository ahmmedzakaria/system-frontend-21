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

    // Access Control — Users & Roles
    USER_LIST: { apiPath: 'system/user/list', actionType: ActionTypes.SEARCH },
    USER_SAVE: { apiPath: 'system/user/save', actionType: ActionTypes.CREATE },
    USER_ASSIGN_ROLES: { apiPath: 'system/user/assign-roles', actionType: ActionTypes.CREATE },
    ROLE_LIST: { apiPath: 'system/role/list', actionType: ActionTypes.SEARCH },
    ROLE_SAVE: { apiPath: 'system/role/save', actionType: ActionTypes.CREATE },
    GLOBAL_ROLE_SAVE: { apiPath: 'system/role/global/save', actionType: ActionTypes.CREATE },

    // Tenant control plane
    TENANT_REGISTER: { apiPath: 'system/tenants/register', actionType: ActionTypes.CREATE },
    TENANT_LIST: { apiPath: 'system/tenants/list', actionType: ActionTypes.SEARCH },
    TENANT_DOMAIN_VERIFY: { apiPath: 'system/tenants/domain/verify', actionType: ActionTypes.UPDATE },
    TENANT_ACTIVATE: { apiPath: 'system/tenants/activate', actionType: ActionTypes.UPDATE },
    TENANT_SUSPEND: { apiPath: 'system/tenants/suspend', actionType: ActionTypes.UPDATE },
    TENANT_REACTIVATE: { apiPath: 'system/tenants/reactivate', actionType: ActionTypes.UPDATE },
    TENANT_CANCEL: { apiPath: 'system/tenants/cancel', actionType: ActionTypes.UPDATE },

    // Privileges
    PRIVILEGE_LIST: { apiPath: 'system/privilege/list', actionType: ActionTypes.SEARCH },
    PRIVILEGE_SAVE: { apiPath: 'system/privilege/save', actionType: ActionTypes.CREATE },
    SUB_MENU_LIST: { apiPath: 'system/privilege/sub-menu/list', actionType: ActionTypes.SEARCH },
    SUB_MENU_SAVE: { apiPath: 'system/privilege/sub-menu/save', actionType: ActionTypes.CREATE },

    // Layout
    LAYOUT_PROFILE_LIST: { apiPath: 'system/layout/profile/list', actionType: ActionTypes.SEARCH },
    LAYOUT_PROFILE_SAVE: { apiPath: 'system/layout/profile/save', actionType: ActionTypes.CREATE },
    LAYOUT_UI_POLICY_LIST: { apiPath: 'system/layout/ui-policy/list', actionType: ActionTypes.SEARCH },
    LAYOUT_UI_POLICY_SAVE: { apiPath: 'system/layout/ui-policy/save', actionType: ActionTypes.CREATE },
    LAYOUT_CLIENT_ASSIGN_LIST: { apiPath: 'system/layout/client/list', actionType: ActionTypes.SEARCH },
    LAYOUT_CLIENT_ASSIGN_SAVE: { apiPath: 'system/layout/client/assign', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_TREE: { apiPath: 'system/layout/navigation/tree', actionType: ActionTypes.SEARCH },
    LAYOUT_NAVIGATION_TREE_ADMIN: { apiPath: 'system/layout/navigation/tree/admin', actionType: ActionTypes.SEARCH },
    LAYOUT_NAVIGATION_GROUP_SAVE: { apiPath: 'system/layout/navigation/group/save', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_MODULE_SAVE: { apiPath: 'system/layout/navigation/module/save', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_CATEGORY_SAVE: { apiPath: 'system/layout/navigation/category/save', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_FEATURE_GROUP_SAVE: { apiPath: 'system/layout/navigation/feature-group/save', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_FEATURE_SAVE: { apiPath: 'system/layout/navigation/feature/save', actionType: ActionTypes.CREATE },

    // License
    LICENSE_PLAN_LIST: { apiPath: 'system/license/plan/list', actionType: ActionTypes.SEARCH },
    LICENSE_PLAN_SAVE: { apiPath: 'system/license/plan/save', actionType: ActionTypes.CREATE },
    LICENSE_PLAN_ENTITLEMENT_LIST: { apiPath: 'system/license/plan/entitlement/list', actionType: ActionTypes.SEARCH },
    LICENSE_PLAN_ENTITLEMENT_SAVE: { apiPath: 'system/license/plan/entitlement/save', actionType: ActionTypes.CREATE },
    LICENSE_SUBSCRIPTION_LIST: { apiPath: 'system/license/subscription/list', actionType: ActionTypes.SEARCH },
    LICENSE_SUBSCRIPTION_ASSIGN: { apiPath: 'system/license/subscription/assign', actionType: ActionTypes.CREATE },
    LICENSE_SUBSCRIPTION_SUSPEND: { apiPath: 'system/license/subscription/suspend', actionType: ActionTypes.UPDATE },
    LICENSE_SUBSCRIPTION_REACTIVATE: { apiPath: 'system/license/subscription/reactivate', actionType: ActionTypes.UPDATE },
    LICENSE_SUBSCRIPTION_CANCEL: { apiPath: 'system/license/subscription/cancel', actionType: ActionTypes.UPDATE },
    LICENSE_SUBSCRIPTION_ENTITLEMENT_LIST: { apiPath: 'system/license/subscription/entitlement/list', actionType: ActionTypes.SEARCH },
    LICENSE_SUBSCRIPTION_ENTITLEMENT_SAVE: { apiPath: 'system/license/subscription/entitlement/save', actionType: ActionTypes.CREATE },
    LICENSE_KEY_LIST: { apiPath: 'system/license/key/list', actionType: ActionTypes.SEARCH },
    LICENSE_KEY_GENERATE: { apiPath: 'system/license/key/generate', actionType: ActionTypes.CREATE },

    // Database Backup Administration
    BACKUP_RUN: { apiPath: 'system/backup/run', actionType: ActionTypes.CREATE },
    BACKUP_LIST: { apiPath: 'system/backup/list', actionType: ActionTypes.SEARCH },
    BACKUP_DETAIL: { apiPath: 'system/backup/detail', actionType: ActionTypes.SEARCH },
    BACKUP_DOWNLOAD: { apiPath: 'system/backup/download', actionType: ActionTypes.UPDATE },
} satisfies Record<string, ApiEndpoint>;
