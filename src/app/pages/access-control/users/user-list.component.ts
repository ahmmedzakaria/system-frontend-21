import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { of } from 'rxjs';
import {
    ButtonComponent,
    CheckboxComponent,
    DynamicListLoader,
    DynamicModalComponent,
    DynamicTabComponent,
    DynamicTabConfig,
    ListColumnConfig,
    ModalComponent
} from '@nexacore/shared';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@nexacore/platform';
import { RoleService } from '../../../core/services/role.service';
import { UserService } from '../../../core/services/user.service';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { PRIVILEGE_PRIVILEGES, PrivilegeDto } from '../privileges/privileges.model';
import {
    ROLE_FIELDS,
    RoleDto,
    RoleRequestDto,
    USER_CREATE_FIELDS,
    USER_EDIT_FIELDS,
    USER_PRIVILEGES,
    UserDto,
    UserRequestDto,
    formatDateTime,
    roleInitialValue,
    rolesLabel,
    userInitialValue
} from './user.model';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [ButtonComponent, CheckboxComponent, DynamicModalComponent, DynamicTabComponent, FormsModule, ModalComponent],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.scss'
})
export class UserListComponent {
    private readonly userService = inject(UserService);
    private readonly roleService = inject(RoleService);
    private readonly privilegeService = inject(PrivilegeService);
    private readonly authService = inject(AuthService);

    private readonly tabsRef = viewChild<DynamicTabComponent>('tabsRef');
    protected readonly activeTabIndex = signal(0);
    protected readonly activeTabKey = computed(() => this.tabs()[this.activeTabIndex()]?.key);

    protected readonly users = signal<UserDto[]>([]);
    protected readonly roles = signal<RoleDto[]>([]);
    protected readonly globalRoles = computed(() => this.roles().filter((role) => role.globalTemplate));
    protected readonly tenantRoles = computed(() => this.roles().filter((role) => !role.globalTemplate));
    protected readonly assignableGlobalRoles = computed(() => this.globalRoles().filter((role) => role.active));
    protected readonly assignableTenantRoles = computed(() => this.tenantRoles().filter((role) => role.active));
    protected readonly isPlatformAdmin = this.authService.hasRole('ROLE_SYSTEM_ADMIN');
    protected readonly canManageUsers = this.authService.hasPrivilege(USER_PRIVILEGES.manage);
    protected readonly canAssignRoles = this.authService.hasPrivilege(USER_PRIVILEGES.assignRoles);
    protected readonly canAssignPrivileges = this.authService.hasPrivilege(PRIVILEGE_PRIVILEGES.assign);
    protected readonly currentTenantId = this.readCurrentTenantId();
    protected readonly userError = signal<string | null>(null);

    protected readonly privileges = signal<PrivilegeDto[]>([]);
    protected readonly privilegeGroups = computed(() => {
        const groups = new Map<string, { moduleName: string; submoduleName: string; items: PrivilegeDto[] }>();
        for (const privilege of this.privileges()) {
            if (!privilege.active) continue;
            const key = `${privilege.moduleCode}:${privilege.submoduleCode}`;
            const group = groups.get(key);
            if (group) {
                group.items.push(privilege);
            } else {
                groups.set(key, { moduleName: privilege.moduleName, submoduleName: privilege.submoduleName, items: [privilege] });
            }
        }
        return [...groups.values()];
    });

    constructor() {
        this.reloadUsers();
        this.reloadRoles();
        this.reloadPrivileges();
    }

    private reloadUsers(): void {
        this.userService.list().subscribe((rows) => {
            this.users.set(rows);
            this.tabsRef()?.reloadTab('users');
        });
    }

    private reloadRoles(): void {
        this.roleService.list().subscribe((rows) => {
            this.roles.set(rows);
            this.tabsRef()?.reloadTab('global-roles');
            this.tabsRef()?.reloadTab('tenant-roles');
        });
    }

    private reloadPrivileges(): void {
        this.privilegeService.list().subscribe((rows) => this.privileges.set(rows));
    }

    private makeLoader<T>(source: () => T[], textOf: (row: T) => string): DynamicListLoader<T> {
        return (params) => {
            const rows = source();
            const query = params.query.trim().toLowerCase();
            const filtered = query ? rows.filter((row) => textOf(row).toLowerCase().includes(query)) : rows;
            const start = (params.page - 1) * params.pageSize;
            return of({ items: filtered.slice(start, start + params.pageSize), total: filtered.length });
        };
    }

    // ---- Users ----

    protected readonly loadUsers = this.makeLoader(this.users, (row) => `${row.username} ${row.personName ?? ''}`);

    private readonly userBaseColumns: ListColumnConfig<UserDto>[] = [
        { key: 'username', header: 'Username' },
        { key: 'normalizedUsername', header: 'Normalized Username' },
        { key: 'tenantId', header: 'Tenant' },
        { key: 'personName', header: 'Canonical Person', format: (row) => row.personName ? `${row.personName} (#${row.personId})` : `Person #${row.personId}` },
        { key: 'email', header: 'Canonical Email', format: (row) => row.email ?? '—' },
        { key: 'roles', header: 'Roles', format: (row) => rolesLabel(row.roles) },
        { key: 'enabled', header: 'Status', type: 'badge', status: (row) => (row.enabled ? 'verified' : 'draft') },
        { key: 'lastLoginAt', header: 'Last Login', format: (row) => formatDateTime(row.lastLoginAt) }
    ];

    protected readonly userColumns: ListColumnConfig<UserDto>[] = [
        ...this.userBaseColumns,
        ...(this.canManageUsers || this.canAssignRoles ? [{
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [
                ...(this.canManageUsers ? [{ icon: 'edit', label: 'Edit', onClick: (row: UserDto) => this.openUserEditor(row) }] : []),
                ...(this.canAssignRoles ? [{ icon: 'user-shield', label: 'Assign Roles', onClick: (row: UserDto) => this.openAssignRoles(row) }] : [])
            ]
        } as ListColumnConfig<UserDto>] : [])
    ];

    private readonly editingUserId = signal<number | null>(null);
    protected readonly userFields = computed(() => this.editingUserId() == null ? USER_CREATE_FIELDS : USER_EDIT_FIELDS);
    protected readonly userEditorOpen = signal(false);
    protected readonly userEditorInitialValue = signal<Record<string, unknown>>({});

    protected openUserEditor(row: UserDto | null): void {
        if (!this.canManageUsers) return;
        this.editingUserId.set(row?.id ?? null);
        this.userError.set(null);
        this.userEditorInitialValue.set(userInitialValue(row));
        this.userEditorOpen.set(true);
    }
    protected closeUserEditor(): void {
        this.userEditorOpen.set(false);
    }
    protected saveUserEditor(value: Record<string, unknown>): void {
        const tenantId = this.currentTenantId;
        if (tenantId == null) {
            this.userError.set('The authenticated token does not contain a tenant context. Please sign in again.');
            return;
        }
        const request: UserRequestDto = {
            id: this.editingUserId(),
            tenantId,
            username: value['username'] as string,
            password: (value['password'] as string) || null,
            email: (value['email'] as string) || null,
            mobile: (value['mobile'] as string) || null,
            firstName: (value['firstName'] as string) || null,
            lastName: (value['lastName'] as string) || null,
            enabled: !!value['enabled']
        };
        this.userService.save(request).subscribe({
            next: () => {
                this.userEditorOpen.set(false);
                this.userError.set(null);
                this.reloadUsers();
            },
            error: (error) => this.userError.set(error?.error?.message?.[0]?.message ?? error?.message ?? 'Unable to save user')
        });
    }

    // ---- Roles ----

    protected readonly loadGlobalRoles = this.makeLoader(this.globalRoles, (row) => `${row.name} ${row.roleCode}`);
    protected readonly loadTenantRoles = this.makeLoader(this.tenantRoles, (row) => `${row.name} ${row.roleCode}`);

    protected readonly globalRoleColumns: ListColumnConfig<RoleDto>[] = [
        { key: 'name', header: 'Name' },
        { key: 'roleCode', header: 'Code' },
        { key: 'description', header: 'Description', format: (row) => row.description || '—' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => row.active ? 'verified' : 'draft' },
        { key: 'updatedBy', header: 'Last Changed By', format: (row) => `User #${row.updatedBy}` },
        { key: 'updatedAt', header: 'Last Changed', format: (row) => formatDateTime(row.updatedAt) }
    ];

    protected readonly platformGlobalRoleColumns: ListColumnConfig<RoleDto>[] = [
        ...this.globalRoleColumns,
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [
                { icon: 'edit', label: 'Edit', onClick: (row) => this.openRoleEditor(row) },
                ...(this.canAssignPrivileges ? [{ icon: 'shield-check', label: 'Assign Privileges', onClick: (row: RoleDto) => this.openAssignPrivileges(row) }] : [])
            ]
        }
    ];

    protected readonly tenantRoleColumns: ListColumnConfig<RoleDto>[] = [
        { key: 'name', header: 'Name' },
        { key: 'roleCode', header: 'Code' },
        { key: 'description', header: 'Description', format: (row) => row.description || '—' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => row.active ? 'verified' : 'draft' },
        { key: 'updatedBy', header: 'Last Changed By', format: (row) => `User #${row.updatedBy}` },
        { key: 'updatedAt', header: 'Last Changed', format: (row) => formatDateTime(row.updatedAt) },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [
                { icon: 'edit', label: 'Edit', onClick: (row) => this.openRoleEditor(row) },
                ...(this.canAssignPrivileges ? [{ icon: 'shield-check', label: 'Assign Privileges', onClick: (row: RoleDto) => this.openAssignPrivileges(row) }] : [])
            ]
        }
    ];

    protected readonly roleFields = ROLE_FIELDS;
    protected readonly roleEditorOpen = signal(false);
    protected readonly roleEditorInitialValue = signal<Record<string, unknown>>({});
    private editingRoleId: number | null = null;
    private editingGlobalRole = false;

    protected openRoleEditor(row: RoleDto | null): void {
        this.editingRoleId = row?.id ?? null;
        this.editingGlobalRole = row?.globalTemplate ?? this.activeTabKey() === 'global-roles';
        if (this.editingGlobalRole && !this.isPlatformAdmin) {
            return;
        }
        this.roleEditorInitialValue.set(roleInitialValue(row));
        this.roleEditorOpen.set(true);
    }
    protected closeRoleEditor(): void {
        this.roleEditorOpen.set(false);
    }
    protected saveRoleEditor(value: Record<string, unknown>): void {
        const request: RoleRequestDto = {
            id: this.editingRoleId,
            name: value['name'] as string,
            roleCode: value['roleCode'] as string,
            description: (value['description'] as string) || null,
            active: !!value['active']
        };
        const save = this.editingGlobalRole ? this.roleService.saveGlobal(request) : this.roleService.save(request);
        save.subscribe(() => {
            this.roleEditorOpen.set(false);
            this.reloadRoles();
        });
    }

    // ---- Assign Roles ----

    protected readonly assignRolesOpen = signal(false);
    protected readonly assigningUser = signal<UserDto | null>(null);
    protected readonly selectedRoleIds = signal<Set<number>>(new Set());
    protected readonly savingRoleAssignment = signal(false);

    protected openAssignRoles(user: UserDto): void {
        if (!this.canAssignRoles) return;
        this.userError.set(null);
        this.assigningUser.set(user);
        this.selectedRoleIds.set(new Set(user.roles.map((role) => role.id)));
        this.assignRolesOpen.set(true);
    }
    protected closeAssignRoles(): void {
        this.assignRolesOpen.set(false);
    }
    protected toggleRole(id: number, checked: boolean): void {
        const next = new Set(this.selectedRoleIds());
        checked ? next.add(id) : next.delete(id);
        this.selectedRoleIds.set(next);
    }
    protected isRoleSelected(id: number): boolean {
        return this.selectedRoleIds().has(id);
    }
    protected saveRoleAssignment(): void {
        const user = this.assigningUser();
        if (!user) {
            return;
        }
        const selectedNames = this.roles()
            .filter((role) => this.selectedRoleIds().has(role.id))
            .map((role) => role.name)
            .join(', ') || 'no roles';
        if (!confirm(`Replace all roles for ${user.username} in tenant ${user.tenantId} with: ${selectedNames}?`)) {
            return;
        }
        this.savingRoleAssignment.set(true);
        this.userService.assignRoles(user.id, [...this.selectedRoleIds()]).subscribe({
            next: () => {
                this.savingRoleAssignment.set(false);
                this.assignRolesOpen.set(false);
                this.reloadUsers();
            },
            error: (error) => {
                this.savingRoleAssignment.set(false);
                this.userError.set(error?.error?.message?.[0]?.message ?? error?.message ?? 'Unable to assign roles');
            }
        });
    }

    // ---- Assign Privileges ----

    protected readonly assignPrivilegesOpen = signal(false);
    protected readonly assigningPrivilegesRole = signal<RoleDto | null>(null);
    protected readonly selectedPrivilegeCodes = signal<Set<string>>(new Set());
    protected readonly savingPrivilegeAssignment = signal(false);

    protected openAssignPrivileges(role: RoleDto): void {
        if (!this.canAssignPrivileges) return;
        this.userError.set(null);
        this.assigningPrivilegesRole.set(role);
        this.selectedPrivilegeCodes.set(new Set());
        this.assignPrivilegesOpen.set(true);
        this.privilegeService.roleCodes(role.id).subscribe((codes) => this.selectedPrivilegeCodes.set(new Set(codes)));
    }
    protected closeAssignPrivileges(): void {
        this.assignPrivilegesOpen.set(false);
    }
    protected togglePrivilege(code: string, checked: boolean): void {
        const next = new Set(this.selectedPrivilegeCodes());
        checked ? next.add(code) : next.delete(code);
        this.selectedPrivilegeCodes.set(next);
    }
    protected isPrivilegeSelected(code: string): boolean {
        return this.selectedPrivilegeCodes().has(code);
    }
    protected saveAssignPrivileges(): void {
        const role = this.assigningPrivilegesRole();
        if (!role) {
            return;
        }
        const count = this.selectedPrivilegeCodes().size;
        if (!confirm(`Replace all privileges for role "${role.name}" with the ${count} selected privilege${count === 1 ? '' : 's'}?`)) {
            return;
        }
        this.savingPrivilegeAssignment.set(true);
        this.privilegeService.assignToRole(role.id, [...this.selectedPrivilegeCodes()]).subscribe({
            next: () => {
                this.savingPrivilegeAssignment.set(false);
                this.assignPrivilegesOpen.set(false);
            },
            error: (error) => {
                this.savingPrivilegeAssignment.set(false);
                this.userError.set(error?.error?.message?.[0]?.message ?? error?.message ?? 'Unable to assign privileges');
            }
        });
    }

    // ---- Tabs ----

    protected readonly tabs = computed<DynamicTabConfig[]>(() => [
        {
            key: 'users', label: 'Users',
            columns: this.userColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadUsers as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search by username or person…',
            emptyTitle: 'No users yet',
            emptyMessage: 'Create the first admin-console user to get started.'
        },
        {
            key: 'global-roles', label: 'Global Templates',
            columns: (this.isPlatformAdmin ? this.platformGlobalRoleColumns : this.globalRoleColumns) as ListColumnConfig<unknown>[],
            loadItems: this.loadGlobalRoles as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search templates by name or code…',
            emptyTitle: 'No global templates',
            emptyMessage: 'Global templates are managed by platform administrators.'
        },
        {
            key: 'tenant-roles', label: 'Tenant Roles',
            columns: this.tenantRoleColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadTenantRoles as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search tenant roles by name or code…',
            emptyTitle: 'No tenant roles yet',
            emptyMessage: 'Create a tenant-specific role for this tenant.'
        }
    ]);

    private readCurrentTenantId(): number | null {
        const token = this.authService.getToken();
        if (!token) return null;
        try {
            const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
            const payload = JSON.parse(atob(paddedPayload));
            const tenantId = Number(payload['tenant_id']);
            return Number.isSafeInteger(tenantId) && tenantId > 0 ? tenantId : null;
        } catch {
            return null;
        }
    }
}
