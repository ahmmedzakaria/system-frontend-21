import { FieldConfig } from '@nexacore/shared';
import { ApiRegistryDto } from '../access-control.model';

const CLIENT_AUTH_OPTIONS = [
    { label: 'None', value: 'NONE' },
    { label: 'Optional', value: 'OPTIONAL' },
    { label: 'Required', value: 'REQUIRED' }
];

const USER_AUTH_OPTIONS = [
    { label: 'None', value: 'NONE' },
    { label: 'Privilege', value: 'PRIVILEGE' }
];

const DATA_SCOPE_OPTIONS = [
    { label: 'None', value: 'NONE' },
    { label: 'Tenant', value: 'TENANT' },
    { label: 'Business', value: 'BUSINESS' },
    { label: 'Branch', value: 'BRANCH' }
];

export const API_REGISTRY_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'apiCode', label: 'API Code', required: true },
    { type: 'text', key: 'httpMethod', label: 'HTTP Method', required: true },
    { type: 'text', key: 'pathPattern', label: 'Path Pattern', required: true, colSpan: 2 },
    { type: 'text', key: 'moduleCode', label: 'Module Code' },
    { type: 'text', key: 'submoduleCode', label: 'Submodule Code' },
    { type: 'text', key: 'featureTypeCode', label: 'Feature Type Code' },
    { type: 'text', key: 'featureCode', label: 'Feature Code' },
    { type: 'text', key: 'actionCode', label: 'Action Code' },
    { type: 'text', key: 'requiredPrivilegeCode', label: 'Required Privilege Code' },
    { type: 'dropdown', key: 'clientAuthenticationRequirement', label: 'Client Authentication', options: CLIENT_AUTH_OPTIONS },
    { type: 'dropdown', key: 'userAuthorizationRequirement', label: 'User Authorization', options: USER_AUTH_OPTIONS },
    { type: 'dropdown', key: 'dataScope', label: 'Data Scope', options: DATA_SCOPE_OPTIONS },
    { type: 'number', key: 'priority', label: 'Priority' },
    { type: 'checkbox', key: 'publicApi', label: 'Public API' },
    { type: 'checkbox', key: 'active', label: 'Active' }
];

export function apiRegistryInitialValue(row: ApiRegistryDto | null): Record<string, unknown> {
    if (!row) {
        return { active: true };
    }
    return {
        apiCode: row.apiCode,
        httpMethod: row.httpMethod,
        pathPattern: row.pathPattern,
        moduleCode: row.moduleCode ?? '',
        submoduleCode: row.submoduleCode ?? '',
        featureTypeCode: row.featureTypeCode ?? '',
        featureCode: row.featureCode ?? '',
        actionCode: row.actionCode ?? '',
        requiredPrivilegeCode: row.requiredPrivilegeCode ?? '',
        clientAuthenticationRequirement: row.clientAuthenticationRequirement ?? 'NONE',
        userAuthorizationRequirement: row.userAuthorizationRequirement ?? 'NONE',
        dataScope: row.dataScope ?? 'NONE',
        priority: row.priority,
        publicApi: row.publicApi,
        active: row.active
    };
}
