import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, tap } from 'rxjs';
import {
    ApplicationContextService,
    AuthorizationPolicyService,
    IconComponent
} from '@nexacore/platform';
import {
    AssignmentChecklistComponent,
    AssignmentLoadStateComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    ModalComponent,
    ReplacementSelectionState,
    ReplacementSummaryComponent, HierarchicalScopeSelectorComponent, HierarchicalScopeValue
} from '@nexacore/shared';
import { FormsModule } from '@angular/forms';
import { ApiRegistryService } from '../../../core/services/api-registry.service';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { AuthorizedScopeService } from '../../../core/services/authorized-scope.service';
import {
    ApiRegistryDto,
    ClientApplicationDto,
    ClientScopeAssignmentDto,
    GeneratedClientCredentialDto
} from '../access-control.model';
import { PrivilegeDto } from '../privileges/privileges.model';
import { TENANT_PRIVILEGES } from '../../tenant/tenant.model';

@Component({
    selector: 'app-client-application-detail',
    standalone: true,
    imports: [
        RouterLink, ButtonComponent, ModalComponent, ConfirmDialogComponent, IconComponent,
        AssignmentChecklistComponent, AssignmentLoadStateComponent, ReplacementSummaryComponent,
        HierarchicalScopeSelectorComponent, FormsModule
    ],
    templateUrl: './client-application-detail.component.html',
    styleUrl: './client-application-detail.component.scss'
})
export class ClientApplicationDetailComponent {
    private readonly clientApps = inject(ClientApplicationService);
    private readonly apiRegistry = inject(ApiRegistryService);
    private readonly privilegesService = inject(PrivilegeService);
    private readonly authorizedScopes = inject(AuthorizedScopeService);
    private readonly context = inject(ApplicationContextService);
    private readonly policy = inject(AuthorizationPolicyService);
    private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
    private readonly tenantId = this.context.effectiveTenant()?.tenantId;

    protected readonly client = signal<ClientApplicationDto | null>(null);
    protected readonly loading = signal(true);
    protected readonly apiOptions = signal<ApiRegistryDto[]>([]);
    protected readonly privilegeOptions = signal<PrivilegeDto[]>([]);
    protected readonly apiState = new ReplacementSelectionState<ApiRegistryDto, number>({ keyOf: item => item.id });
    protected readonly featureState = new ReplacementSelectionState<PrivilegeDto, string>({ keyOf: item => item.privilegeCode });
    protected readonly scopeState = new ReplacementSelectionState<ClientScopeAssignmentDto, string>({ keyOf: scopeKey });

    protected readonly apiSelectedKeys = computed(() => new Set(this.apiState.selected().map(item => item.id)));
    protected readonly featureSelectedKeys = computed(() => new Set(this.featureState.selected().map(item => item.privilegeCode)));
    protected readonly scopeSelectedKeys = computed(() => new Set(this.scopeState.selected().map(scopeKey)));
    protected readonly scopeDraft = signal<HierarchicalScopeValue|null>(null);
    private readonly scopeTenantNames = signal(new Map<number,string>());
    private readonly scopeBusinessNames = signal(new Map<string,string>());
    private readonly scopeBranchNames = signal(new Map<string,string>());
    protected readonly loadTenants=()=>this.authorizedScopes.tenants().pipe(tap(options=>
        this.scopeTenantNames.set(new Map(options.map(option=>[option.id,option.label])))));
    protected readonly loadBusinesses=(tenantId:number)=>this.authorizedScopes.businesses(tenantId).pipe(tap(options=>{
        const names=new Map(this.scopeBusinessNames()); options.forEach(option=>names.set(`${tenantId}:${option.id}`,option.label));
        this.scopeBusinessNames.set(names);
    }));
    protected readonly loadBranches=(tenantId:number,businessId:number)=>this.authorizedScopes.branches(tenantId,businessId).pipe(tap(options=>{
        const names=new Map(this.scopeBranchNames()); options.forEach(option=>names.set(`${tenantId}:${businessId}:${option.id}`,option.label));
        this.scopeBranchNames.set(names);
    }));

    protected readonly canEdit = computed(() => this.policy.isActionAllowed('client-applications.edit'));
    protected readonly canRotate = computed(() => this.policy.isActionAllowed('client-applications.rotate'));
    protected readonly canAssignApi = computed(() => this.policy.isActionAllowed('client-applications.assign-api'));
    protected readonly canAssignFeature = computed(() => this.policy.isActionAllowed('client-applications.assign-feature'));
    protected readonly canAssignScope = computed(() => this.policy.isActionAllowed('client-applications.assign-scope'));
    protected readonly canAdministerTenants = this.policy.privilegeAllowed(TENANT_PRIVILEGES.view);

    protected readonly rotateConfirmOpen = signal(false);
    protected readonly scopeReplacementConfirmOpen = signal(false);
    protected readonly submittedScopes = computed(()=>{
        const scopes=new Map(this.scopeState.selected().map(scope=>[scopeKey(scope),scope]));
        this.scopeState.original().filter(scope=>!this.scopeEditable(scope))
            .forEach(scope=>scopes.set(scopeKey(scope),scope));
        return [...scopes.values()];
    });
    protected readonly removedScopes = computed(()=>{
        const selected=new Set(this.submittedScopes().map(scopeKey));
        return this.scopeState.original().filter(scope=>!selected.has(scopeKey(scope)));
    });
    protected readonly scopeReplacementMessage = computed(()=>{
        const removed=this.removedScopes();
        if(!removed.length) return 'This replaces the complete client scope set. Existing assignments will be retained and the added scopes will be applied.';
        const labels=removed.slice(0,3).map(scope=>this.scopeLabel(scope)).join(', ');
        const remaining=removed.length>3 ? ` and ${removed.length-3} more` : '';
        return `This full replacement will remove ${removed.length} existing scope assignment${removed.length===1?'':'s'}: ${labels}${remaining}. Continue?`;
    });
    protected readonly rotating = signal(false);
    protected readonly generatedCredential = signal<GeneratedClientCredentialDto | null>(null);

    constructor() { this.load(); }

    protected load(): void {
        if (this.tenantId == null) {
            this.loading.set(false);
            this.featureState.loadFailed('A resolved tenant is required to load feature assignments.');
            return;
        }
        this.loading.set(true);
        this.apiState.beginLoad();
        this.featureState.beginLoad();
        this.scopeState.beginLoad();
        forkJoin({
            detail: this.clientApps.detail(this.id, this.tenantId),
            apis: this.apiRegistry.list(),
            privileges: this.privilegesService.list()
        }).subscribe({
            next: ({ detail, apis, privileges }) => {
                this.client.set(detail.client);
                this.apiOptions.set(apis.filter(item => item.active));
                this.privilegeOptions.set(privileges.filter(item => item.active));
                this.apiState.loadSucceeded(apis.filter(item => detail.apiRegistryIds.includes(item.id)));
                this.featureState.loadSucceeded(privileges.filter(item => detail.privilegeCodes.includes(item.privilegeCode)));
                this.scopeState.loadSucceeded(detail.scopeAssignments,detail.scopeVersion);
                this.loading.set(false);
            },
            error: () => {
                this.client.set(null);
                this.apiState.loadFailed('Current API assignments could not be loaded.');
                this.featureState.loadFailed('Current feature assignments could not be loaded.');
                this.scopeState.loadFailed('Current scope assignments could not be loaded.');
                this.loading.set(false);
            }
        });
    }

    protected toggleApi(change: { item: ApiRegistryDto; selected: boolean }): void { this.apiState.toggle(change.item, change.selected); }
    protected toggleFeature(change: { item: PrivilegeDto; selected: boolean }): void { this.featureState.toggle(change.item, change.selected); }
    protected toggleScope(change: { item: ClientScopeAssignmentDto; selected: boolean }): void { this.scopeState.toggle(change.item, change.selected); }
    protected addScope():void { const value=this.scopeDraft(); if(!value || this.scopeState.selected().some(scope=>scopeKey(scope)===scopeKey(value))) return;
        this.scopeState.setSelection([...this.scopeState.selected(),{...value,active:true}]); this.scopeDraft.set(null); }
    protected removeScope(scope:ClientScopeAssignmentDto):void { if(!this.scopeEditable(scope)) return;
        this.scopeState.setSelection(this.scopeState.selected().filter(item=>scopeKey(item)!==scopeKey(scope))); }
    protected scopeEditable(scope:ClientScopeAssignmentDto):boolean { return this.canAdministerTenants() || (this.context.effectiveTenant()?.scopeAssignments??[]).some(authority=>
        authority.tenantId===scope.tenantId && (authority.businessId==null || authority.businessId===scope.businessId)
        && (authority.branchId==null || authority.branchId===scope.branchId)); }

    protected saveApis(): void {
        if (!this.apiState.beginSave()) return;
        this.clientApps.assignApiPermissions(this.id, this.apiState.selected().map(item => item.id)).subscribe(this.saveObserver(this.apiState));
    }

    protected saveFeatures(): void {
        if (!this.featureState.beginSave()) return;
        if (this.tenantId == null) {
            this.featureState.saveFailed('A resolved tenant is required to save feature assignments.');
            return;
        }
        this.clientApps.assignFeaturePermissions(this.id, this.tenantId,
            this.featureState.selected().map(item => item.privilegeCode)).subscribe(this.saveObserver(this.featureState));
    }

    protected requestSaveScopes():void { if(this.scopeState.canSave()) this.scopeReplacementConfirmOpen.set(true); }

    protected saveScopes(): void {
        const version=this.scopeState.version(); if (!version || !this.scopeState.beginSave()) return;
        this.clientApps.assignScopes(this.id, this.submittedScopes(),version).subscribe({
            next:()=>{ this.scopeReplacementConfirmOpen.set(false); this.scopeState.saveSucceeded(); this.load();
                this.context.refresh().subscribe({error:()=>undefined}); },
            error:()=>{ this.scopeReplacementConfirmOpen.set(false);
                this.scopeState.saveFailed('The replacement was rejected. Current selections were retained.'); }
        });
    }

    protected confirmRotate(): void {
        if (!this.canRotate()) return;
        this.rotating.set(true);
        this.clientApps.rotateApiKey(this.id).subscribe({
            next: credential => {
                this.rotating.set(false);
                this.rotateConfirmOpen.set(false);
                this.generatedCredential.set(credential);
                this.context.refresh().subscribe({ error: () => undefined });
            },
            error: () => { this.rotating.set(false); this.rotateConfirmOpen.set(false); }
        });
    }

    protected readonly apiKey = (item: ApiRegistryDto) => item.id;
    protected readonly apiLabel = (item: ApiRegistryDto) => `${item.httpMethod} ${item.pathPattern}`;
    protected readonly apiDetail = (item: ApiRegistryDto) => item.apiCode;
    protected readonly privilegeKey = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly privilegeLabel = (item: PrivilegeDto) => `${item.featureName} — ${item.actionName}`;
    protected readonly privilegeDetail = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly scopeKey = scopeKey;
    protected readonly scopeLabel = (scope: ClientScopeAssignmentDto) => {
        const tenant=this.scopeTenantNames().get(scope.tenantId)??`Tenant #${scope.tenantId}`;
        const business=scope.businessId==null?'':` / ${this.scopeBusinessNames().get(`${scope.tenantId}:${scope.businessId}`)??`Business #${scope.businessId}`}`;
        const branch=scope.branchId==null?'':` / ${this.scopeBranchNames().get(`${scope.tenantId}:${scope.businessId}:${scope.branchId}`)??`Branch #${scope.branchId}`}`;
        return `${tenant}${business}${branch}`;
    };

    private saveObserver<T, K>(state: ReplacementSelectionState<T, K>) {
        return {
            next: () => {
                state.saveSucceeded();
                this.context.refresh().subscribe({ error: () => undefined });
            },
            error: () => state.saveFailed('The replacement was rejected. Current selections were retained.')
        };
    }
}

function scopeKey(scope: Pick<ClientScopeAssignmentDto,'tenantId'|'businessId'|'branchId'>): string {
    return `${scope.tenantId}:${scope.businessId ?? ''}:${scope.branchId ?? ''}`;
}
