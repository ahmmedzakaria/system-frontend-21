import { FieldConfig } from '@nexacore/shared';

// Mirrors backend DTOs 1:1 (com.nexacore.authmodule.core.dto.*).

export interface RoleDto {
    id: number;
    name: string;
    tenantId: number | null;
    roleCode: string;
    description: string | null;
    active: boolean;
    globalTemplate: boolean;
    createdBy: number;
    updatedBy: number;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface RoleRequestDto {
    id: number | null;
    name: string;
    roleCode: string;
    description: string | null;
    active: boolean;
}

export interface UserDto {
    id: number;
    tenantId: number;
    username: string;
    normalizedUsername: string;
    personId: number | null;
    personName: string | null;
    email: string | null;
    mobile: string | null;
    enabled: boolean;
    roles: RoleDto[];
    lastLoginAt: string | null;
}

export interface UserRequestDto {
    id: number | null;
    tenantId: number;
    username: string;
    /** Required on create. On update, a blank/null password leaves the existing password unchanged. */
    password: string | null;
    email: string | null;
    mobile: string | null;
    firstName: string | null;
    lastName: string | null;
    enabled: boolean;
}

export interface UserRoleAssignmentRequestDto {
    userId: number;
    roleIds: number[];
}

export const USER_PRIVILEGES = {
    view: '11020100701',
    manage: '11020100787',
    assignRoles: '11020100781'
} as const;

export function rolesLabel(roles: RoleDto[]): string {
    return roles.length ? roles.map((role) => role.name).join(', ') : '—';
}

export function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }
    return new Date(value).toLocaleString();
}

// ---- Field configs ----
// email/mobile/firstName/lastName only take effect on create (they seed the
// linked Person record via ensurePersonForUser) — the backend intentionally
// ignores them on update, since editing an existing Person is the KYC Person
// module's job, not this form's. Both create and edit share one field list;
// the create-only fields simply have no effect when editing (username/
// password/enabled remain live either way).

export const USER_CREATE_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'username', label: 'Username', required: true },
    { type: 'password', key: 'password', label: 'Password', required: true },
    { type: 'email', key: 'email', label: 'Canonical Email' },
    { type: 'tel', key: 'mobile', label: 'Canonical Mobile' },
    { type: 'text', key: 'firstName', label: 'First Name', required: true },
    { type: 'text', key: 'lastName', label: 'Last Name' },
    { type: 'checkbox', key: 'enabled', label: 'Enabled' }
];

export const USER_EDIT_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'username', label: 'Username', required: true },
    { type: 'password', key: 'password', label: 'New Password (leave blank to keep unchanged)' },
    { type: 'checkbox', key: 'enabled', label: 'Enabled' }
];

export function userInitialValue(row: UserDto | null): Record<string, unknown> {
    if (!row) {
        return { enabled: true };
    }
    return {
        username: row.username,
        password: '',
        email: row.email ?? '',
        mobile: row.mobile ?? '',
        firstName: '',
        lastName: '',
        enabled: row.enabled
    };
}

export const ROLE_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'name', label: 'Name', required: true },
    { type: 'text', key: 'roleCode', label: 'Role Code', required: true },
    { type: 'text', key: 'description', label: 'Description' },
    { type: 'checkbox', key: 'active', label: 'Active' }
];

export function roleInitialValue(row: RoleDto | null): Record<string, unknown> {
    return {
        name: row?.name ?? '',
        roleCode: row?.roleCode ?? '',
        description: row?.description ?? '',
        active: row?.active ?? true
    };
}
