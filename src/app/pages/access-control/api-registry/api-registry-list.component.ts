import { Component, inject, signal, viewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import {
    ButtonComponent,
    DynamicListLoader,
    DynamicModalComponent,
    DynamicTabComponent,
    DynamicTabConfig,
    ListColumnConfig
} from '@nexacore/shared';
import { ApiRegistryService } from '../../../core/services/api-registry.service';
import { ApiInventoryItemDto, ApiRegistryDto, ApiRegistryRequestDto, ApiRegistrySyncReportDto } from '../access-control.model';
import { API_REGISTRY_FIELDS, apiRegistryInitialValue } from './api-registry.model';
import { AuthorizedUiDirective } from '@nexacore/platform';

@Component({
    selector: 'app-api-registry-list',
    standalone: true,
    imports: [ButtonComponent, DynamicModalComponent, DynamicTabComponent, AuthorizedUiDirective],
    templateUrl: './api-registry-list.component.html',
    styleUrl: './api-registry-list.component.scss'
})
export class ApiRegistryListComponent {
    private readonly service = inject(ApiRegistryService);

    protected readonly syncing = signal(false);
    protected readonly syncReport = signal<ApiRegistrySyncReportDto | null>(null);

    protected readonly editorOpen = signal(false);
    protected readonly editorFields = API_REGISTRY_FIELDS;
    protected readonly editorInitialValue = signal<Record<string, unknown>>({});
    private editingId: number | null = null;

    private readonly tabsRef = viewChild<DynamicTabComponent>('tabsRef');

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
            actions: [{ icon: 'edit', label: 'Edit', permissionKey: 'api-registry.manage', onClick: (row) => this.openEditor(row) }]
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

    protected readonly tabs: DynamicTabConfig[] = [
        {
            key: 'registered', label: 'Registered',
            columns: this.registeredColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadRegistered as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search by API code or path…',
            emptyTitle: 'No registered APIs yet',
            emptyMessage: 'Sync from code, or add an entry manually.'
        },
        {
            key: 'inventory', label: 'Inventory',
            columns: this.inventoryColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadInventory as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search by API code or path…',
            emptyTitle: 'No endpoints found',
            emptyMessage: 'The live scan found nothing under com.nexacore.'
        }
    ];

    protected sync(): void {
        this.syncing.set(true);
        this.service.sync().subscribe({
            next: (report) => {
                this.syncing.set(false);
                this.syncReport.set(report);
                this.tabsRef()?.reloadTab('registered');
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
            this.tabsRef()?.reloadTab('registered');
        });
    }
}
