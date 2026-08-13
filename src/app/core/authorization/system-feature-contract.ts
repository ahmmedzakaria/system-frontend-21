import { ApiEndpoints } from '../api/api-endpoints';

export type SystemApiEndpointKey = keyof typeof ApiEndpoints;
export type SystemApiDataScope = 'NONE' | 'TENANT' | 'BUSINESS' | 'BRANCH';

export interface SystemEndpointContract {
    endpoint: SystemApiEndpointKey;
    privilege: string;
    dataScope: SystemApiDataScope;
}

export interface SystemFeatureContract {
    feature: string;
    routes: Readonly<Record<string, string>>;
    actions: Readonly<Record<string, string>>;
    endpoints: readonly SystemEndpointContract[];
}

const endpoint = (endpointKey: SystemApiEndpointKey, privilege: string, dataScope: SystemApiDataScope = 'NONE'):
SystemEndpointContract => ({ endpoint: endpointKey, privilege, dataScope });

export const SYSTEM_FEATURE_CONTRACTS: readonly SystemFeatureContract[] = [
    {
        feature: 'client-applications',
        routes: {
            '/access-control/client-applications': '11020100101',
            '/access-control/client-applications/create': '11020100187',
            '/access-control/client-applications/:id/edit': '11020100187',
            '/access-control/client-applications/:id': '11020100101'
        },
        actions: {
            'client-applications.create': '11020100187', 'client-applications.edit': '11020100187',
            'client-applications.rotate': '11020100283', 'client-applications.assign-api': '11020100381',
            'client-applications.assign-feature': '11020100481', 'client-applications.assign-scope': '11020100581'
        },
        endpoints: [
            endpoint('CLIENT_APP_SAVE', '11020100187'), endpoint('CLIENT_APP_LIST', '11020100101'),
            endpoint('CLIENT_APP_DETAIL', '11020100101'), endpoint('CLIENT_APP_API_PERMISSIONS', '11020100381'),
            endpoint('CLIENT_APP_FEATURE_PERMISSIONS', '11020100481'), endpoint('CLIENT_APP_SCOPE_ASSIGNMENTS', '11020100581'),
            endpoint('CLIENT_APP_ROTATE_API_KEY', '11020100283'), endpoint('CLIENT_APP_ASSIGN_API_PERMISSIONS', '11020100381'),
            endpoint('CLIENT_APP_ASSIGN_FEATURE_PERMISSIONS', '11020100481'), endpoint('CLIENT_APP_ASSIGN_TENANTS', '11020100581')
        ]
    },
    {
        feature: 'api-registry', routes: { '/access-control/api-registry': '11020100601' },
        actions: { 'api-registry.manage': '11020100687', 'api-registry.synchronize': '11020100680' },
        endpoints: [endpoint('API_REGISTRY_INVENTORY', '11020100601'), endpoint('API_REGISTRY_LIST', '11020100601'),
            endpoint('API_REGISTRY_SAVE', '11020100687'), endpoint('API_REGISTRY_SYNC', '11020100680')]
    },
    {
        feature: 'users-and-roles', routes: { '/access-control/users': '11020100701' },
        actions: { 'users.manage': '11020100787', 'users.assign': '11020100781' },
        endpoints: [
            endpoint('USER_LIST', '11020100701'), endpoint('USER_SAVE', '11020100787'), endpoint('USER_ASSIGN_ROLES', '11020100781'),
            endpoint('USER_SCOPE_ASSIGNMENTS', '11020100701'), endpoint('USER_REPLACE_SCOPE_ASSIGNMENTS', '11020100781'),
            endpoint('ROLE_LIST', '11020100801'), endpoint('ROLE_SAVE', '11020100887'), endpoint('GLOBAL_ROLE_SAVE', '11020100887')
        ]
    },
    {
        feature: 'tenants', routes: { '/access-control/tenants': '11020100901' },
        actions: { 'tenants.register': '11020100910', 'tenants.verify-domain': '11020100980', 'tenants.manage-lifecycle': '11020100987' },
        endpoints: [endpoint('TENANT_REGISTER', '11020100910'), endpoint('TENANT_LIST', '11020100901'),
            endpoint('TENANT_DOMAIN_VERIFY', '11020100980'), endpoint('TENANT_ACTIVATE', '11020100987'),
            endpoint('TENANT_SUSPEND', '11020100987'), endpoint('TENANT_REACTIVATE', '11020100987'), endpoint('TENANT_CANCEL', '11020100987')]
    },
    {
        feature: 'privileges', routes: { '/access-control/privileges': '11010100101' },
        actions: { 'privileges.assign': '11010100181' },
        endpoints: [endpoint('PRIVILEGE_LIST', '11010100101'), endpoint('PRIVILEGE_SAVE', '11010100180'),
            endpoint('PRIVILEGE_ASSIGN_ROLE', '11010100181'), endpoint('PRIVILEGE_ROLE_CODES', '11010100101'),
            endpoint('SUB_MENU_LIST', '11010100101'), endpoint('SUB_MENU_SAVE', '11010100180')]
    },
    {
        feature: 'layout', routes: { '/layout/profiles': '11040100101', '/layout/navigation-tree': '11040100101' },
        actions: { 'layout.manage': '11040100187' },
        endpoints: [
            endpoint('LAYOUT_PROFILE_LIST', '11040100101'), endpoint('LAYOUT_PROFILE_SAVE', '11040100187'),
            endpoint('LAYOUT_UI_POLICY_LIST', '11040100101'), endpoint('LAYOUT_UI_POLICY_SAVE', '11040100187'),
            endpoint('LAYOUT_CLIENT_ASSIGN_LIST', '11040100101'), endpoint('LAYOUT_CLIENT_ASSIGN_SAVE', '11040100187'),
            endpoint('LAYOUT_NAVIGATION_TREE', 'AUTHENTICATED'), endpoint('LAYOUT_NAVIGATION_TREE_ADMIN', '11040100101'),
            endpoint('LAYOUT_NAVIGATION_GROUP_SAVE', '11040100187'), endpoint('LAYOUT_NAVIGATION_MODULE_SAVE', '11040100187'),
            endpoint('LAYOUT_NAVIGATION_CATEGORY_SAVE', '11040100187'), endpoint('LAYOUT_NAVIGATION_FEATURE_GROUP_SAVE', '11040100187'),
            endpoint('LAYOUT_NAVIGATION_FEATURE_SAVE', '11040100187')
        ]
    },
    {
        feature: 'license', routes: { '/license': '11030199901' }, actions: { 'license.manage': '11030199987' },
        endpoints: [
            endpoint('LICENSE_PLAN_LIST', '11030199901'), endpoint('LICENSE_PLAN_SAVE', '11030199987'),
            endpoint('LICENSE_PLAN_ENTITLEMENT_LIST', '11030199901'), endpoint('LICENSE_PLAN_ENTITLEMENT_SAVE', '11030199987'),
            endpoint('LICENSE_SUBSCRIPTION_LIST', '11030199901'), endpoint('LICENSE_SUBSCRIPTION_ASSIGN', '11030199987'),
            endpoint('LICENSE_SUBSCRIPTION_SUSPEND', '11030199987'), endpoint('LICENSE_SUBSCRIPTION_REACTIVATE', '11030199987'),
            endpoint('LICENSE_SUBSCRIPTION_CANCEL', '11030199987'), endpoint('LICENSE_SUBSCRIPTION_ENTITLEMENT_LIST', '11030199901'),
            endpoint('LICENSE_SUBSCRIPTION_ENTITLEMENT_SAVE', '11030199987'), endpoint('LICENSE_KEY_LIST', '11030199901'),
            endpoint('LICENSE_KEY_GENERATE', '11030199987')
        ]
    },
    {
        feature: 'backup', routes: { '/backup': '11060100101' },
        actions: { 'backup.execute': '11060100113', 'backup.download': '11060100104', 'backup.deliver': '11060100180', 'backup.manage': '11060100187' },
        endpoints: [endpoint('BACKUP_RUN', '11060100113'), endpoint('BACKUP_LIST', '11060100101'),
            endpoint('BACKUP_DETAIL', '11060100101'), endpoint('BACKUP_DOWNLOAD', '11060100104')]
    }
] as const;

export const SYSTEM_ROUTE_PRIVILEGES = Object.assign({}, ...SYSTEM_FEATURE_CONTRACTS.map(feature => feature.routes)) as Readonly<Record<string, string>>;
export const SYSTEM_ACTION_PRIVILEGES = Object.assign({}, ...SYSTEM_FEATURE_CONTRACTS.map(feature => feature.actions)) as Readonly<Record<string, string>>;
