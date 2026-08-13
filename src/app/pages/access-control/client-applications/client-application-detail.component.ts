import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
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
    ReplacementSummaryComponent
} from '@nexacore/shared';
import { ApiRegistryService } from '../../../core/services/api-registry.service';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { TenantAdministrationService } from '../../../core/services/tenant-administration.service';
import {
    ApiRegistryDto,
    ClientApplicationDto,
    ClientScopeAssignmentDto,
    GeneratedClientCredentialDto
} from '../access-control.model';
import { PrivilegeDto } from '../privileges/privileges.model';
import { TenantDto } from '../../tenant/tenant.model';

@Component({
    selector: 'app-client-application-detail',
    standalone: true,
    imports: [
        RouterLink, ButtonComponent, ModalComponent, ConfirmDialogComponent, IconComponent,
        AssignmentChecklistComponent, AssignmentLoadStateComponent, ReplacementSummaryComponent
    ],
    templateUrl: './client-application-detail.component.html',
    styleUrl: './client-application-detail.component.scss'
})
export class ClientApplicationDetailComponent {
    private readonly clientApps = inject(ClientApplicationService);
    private readonly apiRegistry = inject(ApiRegistryService);
    private readonly privilegesService = inject(PrivilegeService);
    private readonly tenantsService = inject(TenantAdministrationService);
    private readonly context = inject(ApplicationContextService);
    private readonly policy = inject(AuthorizationPolicyService);
    private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

    protected readonly client = signal<ClientApplicationDto | null>(null);
    protected readonly loading = signal(true);
    protected readonly apiOptions = signal<ApiRegistryDto[]>([]);
    protected readonly privilegeOptions = signal<PrivilegeDto[]>([]);
    protected readonly tenants = signal<TenantDto[]>([]);
    protected readonly apiState = new ReplacementSelectionState<ApiRegistryDto, number>({ keyOf: item => item.id });
    protected readonly featureState = new ReplacementSelectionState<PrivilegeDto, string>({ keyOf: item => item.privilegeCode });
    protected readonly scopeState = new ReplacementSelectionState<ClientScopeAssignmentDto, string>({ keyOf: scopeKey });

    protected readonly apiSelectedKeys = computed(() => new Set(this.apiState.selected().map(item => item.id)));
    protected readonly featureSelectedKeys = computed(() => new Set(this.featureState.selected().map(item => item.privilegeCode)));
    protected readonly scopeSelectedKeys = computed(() => new Set(this.scopeState.selected().map(scopeKey)));
    protected readonly scopeOptions = computed(() => {
        const byKey = new Map<string, ClientScopeAssignmentDto>();
        this.tenants().forEach(tenant => byKey.set(scopeKey({ tenantId: tenant.id, businessId: null, branchId: null }), {
            tenantId: tenant.id, businessId: null, branchId: null
        }));
        this.scopeState.original().forEach(scope => byKey.set(scopeKey(scope), scope));
        return [...byKey.values()];
    });

    protected readonly canEdit = computed(() => this.policy.isActionAllowed('client-applications.edit'));
    protected readonly canRotate = computed(() => this.policy.isActionAllowed('client-applications.rotate'));
    protected readonly canAssignApi = computed(() => this.policy.isActionAllowed('client-applications.assign-api'));
    protected readonly canAssignFeature = computed(() => this.policy.isActionAllowed('client-applications.assign-feature'));
    protected readonly canAssignScope = computed(() => this.policy.isActionAllowed('client-applications.assign-scope'));

    protected readonly rotateConfirmOpen = signal(false);
    protected readonly rotating = signal(false);
    protected readonly generatedCredential = signal<GeneratedClientCredentialDto | null>(null);

    constructor() { this.load(); }

    protected load(): void {
        this.loading.set(true);
        this.apiState.beginLoad();
        this.featureState.beginLoad();
        this.scopeState.beginLoad();
        forkJoin({
            detail: this.clientApps.detail(this.id),
            apis: this.apiRegistry.list(),
            privileges: this.privilegesService.list(),
            tenants: this.tenantsService.list()
        }).subscribe({
            next: ({ detail, apis, privileges, tenants }) => {
                this.client.set(detail.client);
                this.apiOptions.set(apis.filter(item => item.active));
                this.privilegeOptions.set(privileges.filter(item => item.active));
                this.tenants.set(tenants.filter(item => item.status !== 'CANCELLED'));
                this.apiState.loadSucceeded(apis.filter(item => detail.apiRegistryIds.includes(item.id)));
                this.featureState.loadSucceeded(privileges.filter(item => detail.privilegeCodes.includes(item.privilegeCode)));
                this.scopeState.loadSucceeded(detail.scopeAssignments);
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

    protected saveApis(): void {
        if (!this.apiState.beginSave()) return;
        this.clientApps.assignApiPermissions(this.id, this.apiState.selected().map(item => item.id)).subscribe(this.saveObserver(this.apiState));
    }

    protected saveFeatures(): void {
        if (!this.featureState.beginSave()) return;
        this.clientApps.assignFeaturePermissions(this.id, this.featureState.selected().map(item => item.privilegeCode)).subscribe(this.saveObserver(this.featureState));
    }

    protected saveScopes(): void {
        if (!this.scopeState.beginSave()) return;
        this.clientApps.assignScopes(this.id, [...this.scopeState.selected()]).subscribe(this.saveObserver(this.scopeState));
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
        const tenant = this.tenants().find(item => item.id === scope.tenantId);
        return `${tenant?.displayName ?? `Tenant ${scope.tenantId}`}${scope.businessId ? ` / Business ${scope.businessId}` : ''}${scope.branchId ? ` / Branch ${scope.branchId}` : ''}`;
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

function scopeKey(scope: ClientScopeAssignmentDto): string {
    return `${scope.tenantId}:${scope.businessId ?? ''}:${scope.branchId ?? ''}`;
}
