import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthorizationPolicyService, IconComponent } from '@nexacore/platform';
import {
    AssignmentChecklistComponent,
    AssignmentLoadStateComponent,
    ButtonComponent,
    ReplacementSelectionState,
    ReplacementSummaryComponent,
} from '@nexacore/shared';
import { ApiRegistryService } from '../../../core/services/api-registry.service';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { ApiRegistryDto, ClientApplicationDto } from '../access-control.model';

@Component({
    selector: 'app-client-api-permissions',
    standalone: true,
    imports: [
        FormsModule,
        IconComponent,
        ButtonComponent,
        AssignmentChecklistComponent,
        AssignmentLoadStateComponent,
        ReplacementSummaryComponent,
    ],
    templateUrl: './client-api-permissions.component.html',
    styleUrl: './client-api-permissions.component.scss',
})
export class ClientApiPermissionsComponent {
    private readonly clientsService = inject(ClientApplicationService);
    private readonly apiRegistryService = inject(ApiRegistryService);
    private readonly policy = inject(AuthorizationPolicyService);

    protected readonly clients = signal<ClientApplicationDto[]>([]);
    protected readonly apiOptions = signal<ApiRegistryDto[]>([]);
    protected readonly selectedClientId = signal<number | null>(null);
    protected readonly loadingCatalog = signal(true);
    protected readonly catalogError = signal('');
    protected readonly state = new ReplacementSelectionState<ApiRegistryDto, number>({ keyOf: item => item.id });

    protected readonly selectedClient = computed(() =>
        this.clients().find(client => client.id === this.selectedClientId()) ?? null);
    protected readonly selectedKeys = computed(() => new Set(this.state.selected().map(item => item.id)));
    protected readonly activeApiCount = computed(() => this.apiOptions().length);
    protected readonly assignedCount = computed(() => this.state.selected().length);
    protected readonly canAssign = computed(() => this.policy.isActionAllowed('client-applications.assign-api'));

    protected readonly apiKey = (item: ApiRegistryDto) => item.id;
    protected readonly apiLabel = (item: ApiRegistryDto) => `${item.httpMethod} ${item.pathPattern}`;
    protected readonly apiDetail = (item: ApiRegistryDto) =>
        [item.apiCode, item.requiredPrivilegeCode ? `Privilege ${item.requiredPrivilegeCode}` : 'No user privilege']
            .join(' · ');
    protected readonly apiGroup = (item: ApiRegistryDto) =>
        [item.moduleName ?? item.moduleCode, item.submoduleName ?? item.submoduleCode]
            .filter(Boolean)
            .join(' / ') || 'Uncategorized';

    constructor() {
        this.loadCatalog();
    }

    protected loadCatalog(): void {
        this.loadingCatalog.set(true);
        this.catalogError.set('');
        forkJoin({ clients: this.clientsService.list(), apis: this.apiRegistryService.list() }).subscribe({
            next: ({ clients, apis }) => {
                const availableClients = [...clients].sort((a, b) => a.clientName.localeCompare(b.clientName));
                this.clients.set(availableClients);
                this.apiOptions.set(apis.filter(api => api.active && !api.publicApi));
                this.loadingCatalog.set(false);
                const currentId = this.selectedClientId();
                const initialClient = availableClients.find(client => client.id === currentId)
                    ?? availableClients.find(client => client.status === 'ACTIVE')
                    ?? availableClients[0];
                if (initialClient) {
                    this.selectedClientId.set(initialClient.id);
                    this.loadAssignments();
                }
            },
            error: () => {
                this.loadingCatalog.set(false);
                this.catalogError.set('Client applications and the API catalog could not be loaded.');
            },
        });
    }

    protected clientChanged(clientId: number | string): void {
        const parsedId = Number(clientId);
        this.selectedClientId.set(Number.isFinite(parsedId) ? parsedId : null);
        this.loadAssignments();
    }

    protected loadAssignments(): void {
        const clientId = this.selectedClientId();
        if (clientId == null) return;
        this.state.beginLoad();
        this.clientsService.apiPermissions(clientId).subscribe({
            next: ids => this.state.loadSucceeded(this.apiOptions().filter(api => ids.has(api.id))),
            error: () => this.state.loadFailed('Current API assignments could not be loaded.'),
        });
    }

    protected toggle(change: { item: ApiRegistryDto; selected: boolean }): void {
        this.state.toggle(change.item, change.selected);
    }

    protected save(): void {
        const clientId = this.selectedClientId();
        if (clientId == null || !this.canAssign() || !this.state.beginSave()) return;
        this.clientsService.assignApiPermissions(clientId, this.state.selected().map(api => api.id)).subscribe({
            next: () => this.state.saveSucceeded(),
            error: () => this.state.saveFailed('The API assignment replacement was rejected. Your selections were retained.'),
        });
    }
}
