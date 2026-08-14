import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ApplicationContextService, AuthorizationPolicyService, AuthorizationRevocationService } from '@nexacore/platform';
import { AssignmentChecklistComponent, AssignmentLoadStateComponent, ButtonComponent, DynamicListLoader,
    DynamicModalComponent, DynamicTabComponent, DynamicTabConfig, ListColumnConfig, ModalComponent,
    ReplacementSelectionState, ReplacementSummaryComponent, FieldConfig } from '@nexacore/shared';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../../core/services/role.service';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { PRIVILEGE_PRIVILEGES, PrivilegeDto } from '../privileges/privileges.model';
import { ROLE_FIELDS, ROLE_PRIVILEGES, RoleDto, RoleRequestDto, formatDateTime, roleInitialValue } from '../users/user.model';
import { TenantAdministrationService } from '../../../core/services/tenant-administration.service';
import { TENANT_PRIVILEGES } from '../../tenant/tenant.model';

@Component({ selector: 'app-role-administration', standalone: true,
    imports: [ButtonComponent, DynamicModalComponent, DynamicTabComponent, ModalComponent,
        AssignmentChecklistComponent, AssignmentLoadStateComponent, ReplacementSummaryComponent, FormsModule],
    templateUrl: './role-administration.component.html', styleUrl: '../users/user-list.component.scss' })
export class RoleAdministrationComponent {
    private readonly rolesApi = inject(RoleService); private readonly privilegesApi = inject(PrivilegeService);
    private readonly policy = inject(AuthorizationPolicyService); private readonly context = inject(ApplicationContextService);
    private readonly tenantsApi = inject(TenantAdministrationService);
    private readonly revocation = inject(AuthorizationRevocationService); private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute); private readonly router = inject(Router);
    private readonly tabs = viewChild<DynamicTabComponent>('tabs');
    protected readonly canManage = this.policy.actionAllowed('roles.manage');
    protected readonly canAssignCatalog = this.policy.privilegeAllowed(PRIVILEGE_PRIVILEGES.assign);
    protected readonly canAdministerTenants = this.policy.privilegeAllowed(TENANT_PRIVILEGES.view);
    protected readonly tenantOptions = signal<{label:string;value:number}[]>([]);
    protected readonly selectedTenantId = signal<number|null>(this.context.effectiveTenant()?.tenantId??null);
    protected readonly roles = signal<RoleDto[]>([]); protected readonly error = signal<string | null>(null);
    protected readonly globalRoles = computed(() => this.roles().filter(role => role.globalTemplate));
    protected readonly tenantRoles = computed(() => this.roles().filter(role => !role.globalTemplate));
    protected readonly editorOpen = signal(false); protected readonly editorValue = signal<Record<string, unknown>>({});
    protected readonly editingRole = signal<RoleDto | null>(null); protected readonly editingGlobal = signal(false);
    protected readonly roleFields = computed<FieldConfig[]>(()=>{
        if(this.editingGlobal()) return ROLE_FIELDS;
        if(this.editingRole()) return [{type:'text',key:'tenantName',label:'Tenant',readonly:true},...ROLE_FIELDS];
        const tenantField:FieldConfig[]=this.canAdministerTenants()?[{type:'dropdown',key:'tenantId',label:'Tenant',required:true,options:this.tenantOptions()}]:[];
        return [...tenantField,...ROLE_FIELDS];
    });
    protected readonly assignmentOpen = signal(false); protected readonly assigningRole = signal<RoleDto | null>(null);
    protected readonly privileges = signal<PrivilegeDto[]>([]);
    protected readonly privilegeState = new ReplacementSelectionState<string, string>({ keyOf: code => code });
    protected readonly selectedCodes = computed(() => new Set(this.privilegeState.selected()));
    protected readonly privilegeKey = (privilege: PrivilegeDto) => privilege.privilegeCode;
    protected readonly privilegeLabel = (privilege: PrivilegeDto) => `${privilege.featureName} — ${privilege.actionName}`;
    protected readonly privilegeDetail = (privilege: PrivilegeDto) => privilege.privilegeCode;
    protected readonly privilegeGroup = (privilege: PrivilegeDto) => `${privilege.moduleName} — ${privilege.submoduleName}`;
    protected readonly summary = computed(() => ({
        additions: this.privilegeState.summary().additions,
        removals: this.privilegeState.summary().removals,
        unchanged: this.privilegeState.summary().unchanged
    }));
    protected readonly codeLabel = (code: string) => code;

    private columns(): ListColumnConfig<RoleDto>[] { return [
        { key: 'name', header: 'Name' }, { key: 'roleCode', header: 'Code' },
        { key: 'description', header: 'Description', format: row => row.description || '—' },
        { key: 'active', header: 'Status', type: 'badge', status: row => row.active ? 'verified' : 'draft' },
        { key: 'updatedAt', header: 'Last Changed', format: row => formatDateTime(row.updatedAt) },
        ...((this.canManage() || this.canAssignCatalog()) ? [{ key: 'actions', header: '', type: 'actions', align: 'end', actions: [
            ...(this.canManage() ? [{ icon: 'edit', label: 'Edit', onClick: (row: RoleDto) => this.openEditor(row) }] : []),
            ...(this.canManage() && this.canAssignCatalog() ? [{ icon: 'shield-check', label: 'Privileges', onClick: (row: RoleDto) => this.openPrivileges(row) }] : [])
        ] } as ListColumnConfig<RoleDto>] : []) ]; }
    private loader(source: () => RoleDto[]): DynamicListLoader<unknown> { return params => {
        const query = params.query.trim().toLowerCase(); const all = source();
        const rows = query ? all.filter(row => `${row.name} ${row.roleCode}`.toLowerCase().includes(query)) : all;
        const start = (params.page - 1) * params.pageSize; return of({ items: rows.slice(start, start + params.pageSize), total: rows.length });
    }; }
    protected readonly tabConfig = computed<DynamicTabConfig[]>(() => [
        { key: 'tenant', label: 'Tenant Roles', columns: this.columns() as ListColumnConfig<unknown>[], loadItems: this.loader(this.tenantRoles) },
        { key: 'global', label: 'Global Templates', columns: this.columns() as ListColumnConfig<unknown>[], loadItems: this.loader(this.globalRoles) }
    ]);

    constructor() {
        this.reload();
        if(this.canAdministerTenants()) this.tenantsApi.list().subscribe({next:tenants=>{
            this.tenantOptions.set(tenants.filter(tenant=>tenant.status==='ACTIVE')
                .map(tenant=>({label:`${tenant.displayName} (${tenant.tenantCode})`,value:tenant.id})));
            if(!this.selectedTenantId()&&this.tenantOptions().length) this.selectedTenantId.set(this.tenantOptions()[0].value);
            this.reload();
        }});
        const editRegistration = this.revocation.watch(this.canManage, () => this.editorOpen.set(false));
        const assignAllowed = computed(() => this.canManage() && this.canAssignCatalog());
        const assignRegistration = this.revocation.watch(assignAllowed, () => this.closePrivileges());
        this.destroyRef.onDestroy(() => { editRegistration.destroy(); assignRegistration.destroy(); });
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (Number.isSafeInteger(id) && id > 0) this.rolesApi.detail(id).subscribe({ next: role => this.openPrivileges(role), error: () => this.error.set('Role is unavailable in the effective tenant.') });
    }
    protected reload(): void { this.rolesApi.list(this.selectedTenantId()).subscribe({ next: rows => { this.roles.set(rows); this.tabs()?.reloadTab('tenant'); this.tabs()?.reloadTab('global'); }, error: () => this.error.set('Roles could not be loaded.') }); }
    protected tenantChanged(value:number):void { this.selectedTenantId.set(Number(value)); this.reload(); }
    protected openEditor(role: RoleDto | null, global = false): void {
        if (!this.canManage()) return; const isGlobal = role?.globalTemplate ?? global;
        if (isGlobal && !this.canAdministerTenants()) return;
        const initial=roleInitialValue(role);
        if(!isGlobal){ const tenantId=role?.tenantId??this.selectedTenantId()??this.context.effectiveTenant()?.tenantId;
            initial['tenantId']=tenantId; initial['tenantName']=this.tenantOptions().find(option=>option.value===tenantId)?.label??`Tenant #${tenantId}`; }
        this.editingRole.set(role); this.editingGlobal.set(isGlobal); this.editorValue.set(initial); this.editorOpen.set(true);
    }
    protected saveEditor(value: Record<string, unknown>): void { const role = this.editingRole();
        const request: RoleRequestDto = { id: role?.id ?? null, tenantId:this.editingGlobal()?null:Number(value['tenantId']??role?.tenantId??this.selectedTenantId()), name: String(value['name']), roleCode: String(value['roleCode']), description: String(value['description'] || '') || null, active: !!value['active'] };
        const operation = this.editingGlobal() ? this.rolesApi.saveGlobal(request) : this.rolesApi.save(request);
        operation.subscribe({ next: () => { this.editorOpen.set(false); this.reload(); }, error: () => this.error.set('Role save was rejected.') });
    }
    protected openPrivileges(role: RoleDto): void {
        if (!this.canManage() || !this.canAssignCatalog()) return;
        this.assigningRole.set(role); this.privilegeState.beginLoad(); this.assignmentOpen.set(true);
        this.privilegesApi.list().subscribe({ next: catalog => { this.privileges.set(catalog.filter(item => item.active));
            this.rolesApi.privilegeAssignments(role.id).subscribe({ next: current => this.privilegeState.loadSucceeded(current.items, current.version),
                error: () => this.privilegeState.loadFailed('Current privileges could not be loaded. Saving is disabled.') });
        }, error: () => this.privilegeState.loadFailed('Privilege catalog could not be loaded. Saving is disabled.') });
    }
    protected togglePrivilege(change: { item: PrivilegeDto; selected: boolean }): void { this.privilegeState.toggle(change.item.privilegeCode, change.selected); }
    protected closePrivileges(): void { this.assignmentOpen.set(false); this.privilegeState.reset(); if (this.route.snapshot.paramMap.has('id')) void this.router.navigate(['/access-control/roles']); }
    protected savePrivileges(): void { const role = this.assigningRole(); const version = this.privilegeState.version();
        if (!role || !version || !this.privilegeState.beginSave()) return;
        this.privilegesApi.assignToRole(role.id, [...this.privilegeState.selected()], version).subscribe({ next: () => { this.privilegeState.saveSucceeded(); this.closePrivileges(); },
            error: () => this.privilegeState.saveFailed('Privilege replacement was rejected. Reload before retrying.') });
    }
}
