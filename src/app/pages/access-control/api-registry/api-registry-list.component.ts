import { Component, inject, signal, viewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import {
    ButtonComponent,
    DynamicFormComponent,
    DynamicListComponent,
    DynamicListLoader,
    ListColumnConfig,
    ModalComponent
} from '@nexacore/shared';
import { ApiRegistryService } from '../../../core/services/api-registry.service';
import { ApiInventoryItemDto, ApiRegistryDto, ApiRegistryRequestDto, ApiRegistrySyncReportDto } from '../access-control.model';
import { API_REGISTRY_FIELDS, apiRegistryInitialValue } from './api-registry.model';

type Tab = 'registered' | 'inventory';

@Component({
    selector: 'app-api-registry-list',
    standalone: true,
    imports: [ButtonComponent, DynamicFormComponent, DynamicListComponent, ModalComponent],
    templateUrl: './api-registry-list.component.html',
    styleUrl: './api-registry-list.component.scss'
})
export class ApiRegistryListComponent {
    private readonly service = inject(ApiRegistryService);

    protected readonly activeTab = signal<Tab>('registered');
    protected readonly syncing = signal(false);
    protected readonly syncReport = signal<ApiRegistrySyncReportDto | null>(null);

    protected readonly editorOpen = signal(false);
    protected readonly editorFields = API_REGISTRY_FIELDS;
    protected readonly editorInitialValue = signal<Record<string, unknown>>({});
    private editingId: number | null = null;

    private readonly registeredList = viewChild<DynamicListComponent<ApiRegistryDto>>('registeredList');

    protected readonly loadRegistered: DynamicListLoader<ApiRegistryDto> = (params) =>
        this.service.list().pipe(
            map((rows) => {
                const query = params.query.trim().toLowerCase();
                const filtered = query
                    ? rows.filter((row) => row.apiCode.toLowerCase().includes(query) || row.pathPattern.toLowerCase().includes(query))
                    : rows;
                const start = (params.page - 1) * params.pageSize;
                return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
            })
        );

    protected readonly loadInventory: DynamicListLoader<ApiInventoryItemDto> = (params) =>
        this.service.inventory().pipe(
            map((rows) => {
                const query = params.query.trim().toLowerCase();
                const filtered = query
                    ? rows.filter((row) => row.apiCode.toLowerCase().includes(query) || row.pathPattern.toLowerCase().includes(query))
                    : rows;
                const start = (params.page - 1) * params.pageSize;
                return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
            })
        );

    protected readonly registeredColumns: ListColumnConfig<ApiRegistryDto>[] = [
        { key: 'apiCode', header: 'API Code' },
        { key: 'httpMethod', header: 'Method' },
        { key: 'pathPattern', header: 'Path' },
        { key: 'requiredPrivilegeCode', header: 'Privilege Code', format: (row) => row.requiredPrivilegeCode ?? '—' },
        { key: 'publicApi', header: 'Public', type: 'pill', label: (row) => (row.publicApi ? 'Public' : 'Protected'), tone: (row) => (row.publicApi ? 'accent' : 'neutral') },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions',
            header: '',
            align: 'end',
            type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', onClick: (row) => this.openEditor(row) }]
        }
    ];

    protected readonly inventoryColumns: ListColumnConfig<ApiInventoryItemDto>[] = [
        { key: 'apiCode', header: 'API Code' },
        { key: 'httpMethod', header: 'Method' },
        { key: 'pathPattern', header: 'Path' },
        { key: 'sourceModule', header: 'Source Module', format: (row) => row.sourceModule ?? '—' },
        {
            key: 'accessMetadataDeclared',
            header: 'Metadata',
            type: 'pill',
            label: (row) => (row.accessMetadataDeclared ? 'Declared' : 'Missing'),
            tone: (row) => (row.accessMetadataDeclared ? 'success' : 'red')
        }
    ];

    protected setTab(tab: Tab): void {
        this.activeTab.set(tab);
    }

    protected sync(): void {
        this.syncing.set(true);
        this.service.sync().subscribe({
            next: (report) => {
                this.syncing.set(false);
                this.syncReport.set(report);
                this.registeredList()?.reload();
            },
            error: () => this.syncing.set(false)
        });
    }

    protected openEditor(row: ApiRegistryDto | null): void {
        this.editingId = row?.id ?? null;
        this.editorInitialValue.set(apiRegistryInitialValue(row));
        this.editorOpen.set(true);
    }

    protected closeEditor(): void {
        this.editorOpen.set(false);
    }

    protected saveEditor(value: Record<string, unknown>): void {
        const request: ApiRegistryRequestDto = {
            id: this.editingId,
            apiCode: value['apiCode'] as string,
            httpMethod: value['httpMethod'] as string,
            pathPattern: value['pathPattern'] as string,
            moduleCode: (value['moduleCode'] as string) || null,
            submoduleCode: (value['submoduleCode'] as string) || null,
            featureTypeCode: (value['featureTypeCode'] as string) || null,
            featureCode: (value['featureCode'] as string) || null,
            actionCode: (value['actionCode'] as string) || null,
            requiredPrivilegeCode: (value['requiredPrivilegeCode'] as string) || null,
            clientAuthenticationRequirement: value['clientAuthenticationRequirement'] as string,
            userAuthorizationRequirement: value['userAuthorizationRequirement'] as string,
            dataScope: value['dataScope'] as string,
            priority: (value['priority'] as number) ?? null,
            publicApi: !!value['publicApi'],
            active: !!value['active']
        };
        this.service.save(request).subscribe(() => {
            this.editorOpen.set(false);
            this.registeredList()?.reload();
        });
    }
}
