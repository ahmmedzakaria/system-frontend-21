import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { of } from 'rxjs';
import { ApplicationContextService, AuthorizationPolicyService, AuthorizationRevocationService } from '@nexacore/platform';
import { AssignmentChecklistComponent, AssignmentLoadStateComponent, ButtonComponent, DynamicListLoader,
    DynamicModalComponent, DynamicTabComponent, DynamicTabConfig, ListColumnConfig, ModalComponent,
    ReplacementSelectionState, ReplacementSummaryComponent, HierarchicalScopeSelectorComponent, HierarchicalScopeValue,
    AccessFeedbackComponent, ResourceLoadState, MutationState } from '@nexacore/shared';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { AuthorizedScopeService } from '../../../core/services/authorized-scope.service';
import { ROLE_PRIVILEGES, RoleDto, USER_CREATE_FIELDS, USER_EDIT_FIELDS, UserDto, UserRequestDto,
    UserScopeAssignmentDto, USER_PRIVILEGES, formatDateTime, rolesLabel, userInitialValue } from './user.model';
import { PageOperationService } from '../../../core/authorization/page-operation.service';

@Component({
    selector: 'app-user-list', standalone: true,
    imports: [ButtonComponent, DynamicModalComponent, DynamicTabComponent, ModalComponent,
        AssignmentChecklistComponent, AssignmentLoadStateComponent, ReplacementSummaryComponent,
        HierarchicalScopeSelectorComponent, FormsModule, AccessFeedbackComponent],
    templateUrl: './user-list.component.html', styleUrl: './user-list.component.scss'
})
export class UserListComponent {
    private readonly usersApi = inject(UserService);
    private readonly rolesApi = inject(RoleService);
    private readonly authorizedScopes = inject(AuthorizedScopeService);
    private readonly context = inject(ApplicationContextService);
    private readonly policy = inject(AuthorizationPolicyService);
    private readonly revocation = inject(AuthorizationRevocationService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly operations = inject(PageOperationService);
    private readonly tabs = viewChild<DynamicTabComponent>('tabs');

    protected readonly canManage = this.policy.actionAllowed('users.manage');
    protected readonly canAssign = this.policy.actionAllowed('users.assign');
    protected readonly canView = this.policy.privilegeAllowed(USER_PRIVILEGES.view);
    protected readonly canViewRoles = this.policy.privilegeAllowed(ROLE_PRIVILEGES.view);
    protected readonly users = signal<UserDto[]>([]);
    protected readonly roles = signal<RoleDto[]>([]);
    protected readonly error = signal<string | null>(null);
    protected readonly listState = new ResourceLoadState<readonly UserDto[]>();
    protected readonly editorMutation = new MutationState();

    protected readonly editorOpen = signal(false);
    protected readonly editingId = signal<number | null>(null);
    protected readonly editorFields = computed(() => this.editingId() == null ? USER_CREATE_FIELDS : USER_EDIT_FIELDS);
    protected readonly editorValue = signal<Record<string, unknown>>({});

    protected readonly roleModalOpen = signal(false);
    protected readonly assigningUser = signal<UserDto | null>(null);
    protected readonly roleState = new ReplacementSelectionState<RoleDto, number>({ keyOf: role => role.id });
    protected readonly selectedRoleKeys = computed(() => new Set(this.roleState.selected().map(role => role.id)));
    protected readonly roleKey = (role: RoleDto) => role.id;
    protected readonly roleLabel = (role: RoleDto) => role.name;
    protected readonly roleDetail = (role: RoleDto) => role.roleCode;
    protected readonly roleGroup = (role: RoleDto) => role.globalTemplate ? 'Global templates' : 'Tenant roles';
    protected readonly scopeModalOpen = signal(false);
    protected readonly scopeUser = signal<UserDto | null>(null);
    protected readonly scopeState = new ReplacementSelectionState<UserScopeAssignmentDto, string>({ keyOf: scopeKey });
    protected readonly availableScopes = computed(() => {
        const choices = new Map<string, UserScopeAssignmentDto>();
        (this.context.effectiveTenant()?.scopeAssignments ?? []).forEach(scope => choices.set(scopeKey(scope), { ...scope, active: true }));
        this.scopeState.original().forEach(scope => choices.set(scopeKey(scope), scope)); return [...choices.values()];
    });
    protected readonly selectedScopeKeys = computed(() => new Set(this.scopeState.selected().map(scopeKey)));
    protected readonly scopeKey = scopeKey;
    protected readonly scopeLabel = (scope: UserScopeAssignmentDto) => `Tenant ${scope.tenantId}${scope.businessId ? ` / Business ${scope.businessId}` : ''}${scope.branchId ? ` / Branch ${scope.branchId}` : ''}`;
    protected readonly scopeDraft = signal<HierarchicalScopeValue | null>(null);
    protected readonly loadTenants = this.authorizedScopes.tenants;
    protected readonly loadBusinesses = this.authorizedScopes.businesses;
    protected readonly loadBranches = this.authorizedScopes.branches;

    protected readonly columns = computed<ListColumnConfig<UserDto>[]>(() => [
        { key: 'username', header: 'Username' }, { key: 'tenantId', header: 'Tenant' },
        { key: 'personName', header: 'Canonical Person', format: row => row.personName ?? `Person #${row.personId}` },
        { key: 'roles', header: 'Roles', format: row => rolesLabel(row.roles) },
        { key: 'enabled', header: 'Status', type: 'badge', status: row => row.enabled ? 'verified' : 'draft' },
        { key: 'lastLoginAt', header: 'Last Login', format: row => formatDateTime(row.lastLoginAt) },
        ...((this.canManage() || (this.canAssign() && this.canViewRoles())) ? [{
            key: 'actions', header: '', type: 'actions', align: 'end', actions: [
                ...(this.canManage() ? [{ icon: 'edit', label: 'Edit', onClick: (row: UserDto) => this.openEditor(row) }] : []),
                ...(this.canAssign() && this.canViewRoles() ? [{ icon: 'user-shield', label: 'Assign Roles', onClick: (row: UserDto) => this.openRoles(row) }] : []),
                ...(this.canAssign() ? [{ icon: 'layers', label: 'Assign Scopes', onClick: (row: UserDto) => this.openScopes(row) }] : [])
            ]
        } as ListColumnConfig<UserDto>] : [])
    ]);
    private readonly loader: DynamicListLoader<UserDto> = params => {
        const query = params.query.trim().toLowerCase();
        const rows = query ? this.users().filter(row => `${row.username} ${row.personName ?? ''}`.toLowerCase().includes(query)) : this.users();
        const start = (params.page - 1) * params.pageSize;
        return of({ items: rows.slice(start, start + params.pageSize), total: rows.length });
    };
    protected readonly tabConfig = computed<DynamicTabConfig[]>(() => [{ key: 'users', label: 'Users',
        columns: this.columns() as ListColumnConfig<unknown>[], loadItems: this.loader as DynamicListLoader<unknown> }]);

    constructor() {
        if (this.canView()) this.reload(); else this.listState.deny('User viewing is not allowed by the effective authorization context.');
        const registration = this.revocation.watch(this.canManage, () => this.editorOpen.set(false));
        const assignmentRegistration = this.revocation.watch(this.canAssign, () => { this.closeRoles(); this.closeScopes(); });
        this.destroyRef.onDestroy(() => { registration.destroy(); assignmentRegistration.destroy(); });
    }

    protected reload(): void { if (!this.canView()) return; this.listState.begin(); this.usersApi.list().subscribe({ next: rows => {
        this.users.set(rows); this.listState.succeed(rows,rows.length===0); this.tabs()?.reloadTab('users'); },
        error: error => { const failure=this.operations.failure(error,'Users could not be loaded.');
            failure.denied ? this.listState.deny(this.operations.display(failure),failure.traceId) : this.listState.fail(this.operations.display(failure),failure.traceId); } }); }
    protected openEditor(row: UserDto | null): void { if (!this.canManage()) return; this.editingId.set(row?.id ?? null); this.editorValue.set(userInitialValue(row)); this.editorOpen.set(true); }
    protected closeEditor(): void { this.editorOpen.set(false); }
    protected saveEditor(value: Record<string, unknown>): void {
        if (!this.canManage() || !this.editorMutation.begin()) return;
        const tenantId = this.context.effectiveTenant()?.tenantId;
        if (!tenantId) { this.error.set('Effective tenant is unavailable.'); return; }
        const request: UserRequestDto = { id: this.editingId(), tenantId, username: String(value['username']), password: String(value['password'] || '') || null,
            email: String(value['email'] || '') || null, mobile: String(value['mobile'] || '') || null,
            firstName: String(value['firstName'] || '') || null, lastName: String(value['lastName'] || '') || null, enabled: !!value['enabled'] };
        this.usersApi.save(request).subscribe({ next: () => { this.editorMutation.succeed(); this.closeEditor(); this.reload(); },
            error: error => { const failure=this.operations.failure(error,'User save was rejected.');
                this.editorMutation.failStructured(failure.message,failure.code,failure.traceId); this.error.set(this.operations.display(failure)); } });
    }
    protected openRoles(user: UserDto): void {
        if (!this.canAssign() || !this.canViewRoles()) return;
        this.assigningUser.set(user); this.roleState.beginLoad(); this.roleModalOpen.set(true);
        this.rolesApi.list().subscribe({ next: roles => {
            this.roles.set(roles.filter(role => role.active));
            this.usersApi.roleAssignments(user.id).subscribe({
                next: current => this.roleState.loadSucceeded(current.items, current.version),
                error: error => this.replacementLoadFailure(this.roleState,error,'Current role assignments could not be loaded. Saving is disabled.') });
        }, error: error => this.replacementLoadFailure(this.roleState,error,'Assignable roles could not be loaded. Saving is disabled.') });
    }
    protected toggleRole(change: { item: RoleDto; selected: boolean }): void { this.roleState.toggle(change.item, change.selected); }
    protected closeRoles(): void { this.roleModalOpen.set(false); this.roleState.reset(); }
    protected saveRoles(): void {
        const user = this.assigningUser(); const version = this.roleState.version();
        if (!user || !version || !this.roleState.beginSave()) return;
        this.usersApi.assignRoles(user.id, this.roleState.selected().map(role => role.id), version).subscribe({
            next: () => { this.roleState.saveSucceeded(); this.closeRoles(); this.reload(); },
            error: error => this.replacementSaveFailure(this.roleState,error,'Role replacement was rejected. Reload before retrying.') });
    }
    protected openScopes(user: UserDto): void { if (!this.canAssign()) return; this.scopeUser.set(user); this.scopeState.beginLoad(); this.scopeModalOpen.set(true);
        this.usersApi.scopeAssignments(user.id).subscribe({ next: result => this.scopeState.loadSucceeded(result.items.filter(scope => scope.active),result.version),
            error: error => this.replacementLoadFailure(this.scopeState,error,'Current scopes could not be loaded. Saving is disabled.') }); }
    protected toggleScope(change: { item: UserScopeAssignmentDto; selected: boolean }): void { this.scopeState.toggle(change.item, change.selected); }
    protected addScope(): void { const value=this.scopeDraft(); if(!value || this.scopeState.selected().some(scope=>scopeKey(scope)===scopeKey(value))) return;
        this.scopeState.setSelection([...this.scopeState.selected(),{...value,active:true}]); this.scopeDraft.set(null); }
    protected removeScope(scope:UserScopeAssignmentDto):void { if(!this.scopeEditable(scope)) return;
        this.scopeState.setSelection(this.scopeState.selected().filter(item=>scopeKey(item)!==scopeKey(scope))); }
    protected scopeEditable(scope:UserScopeAssignmentDto):boolean { return (this.context.effectiveTenant()?.scopeAssignments??[]).some(authority=>
        authority.tenantId===scope.tenantId && (authority.businessId==null || authority.businessId===scope.businessId)
        && (authority.branchId==null || authority.branchId===scope.branchId)); }
    protected closeScopes(): void { this.scopeModalOpen.set(false); this.scopeState.reset(); }
    protected saveScopes(): void { const user = this.scopeUser(); const version=this.scopeState.version(); if (!user || !version || !this.scopeState.beginSave()) return;
        this.usersApi.replaceScopeAssignments(user.id, [...this.scopeState.selected()],version).subscribe({ next: () => { this.scopeState.saveSucceeded(); this.closeScopes(); },
            error: error => this.replacementSaveFailure(this.scopeState,error,'Scope replacement was rejected. Reload before retrying.') }); }

    private replacementLoadFailure<T,K>(state: ReplacementSelectionState<T,K>,error:unknown,fallback:string):void {
        const failure=this.operations.failure(error,fallback); state.loadFailed(this.operations.display(failure),failure.code,failure.traceId);
    }
    private replacementSaveFailure<T,K>(state: ReplacementSelectionState<T,K>,error:unknown,fallback:string):void {
        const failure=this.operations.failure(error,fallback); state.saveFailed(this.operations.display(failure),failure.code,failure.traceId);
    }
}

function scopeKey(scope: Pick<UserScopeAssignmentDto, 'tenantId' | 'businessId' | 'branchId'>): string {
    return `${scope.tenantId}:${scope.businessId ?? ''}:${scope.branchId ?? ''}`;
}
