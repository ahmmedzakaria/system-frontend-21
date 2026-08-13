import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import {
    ButtonComponent,
    DynamicListLoader,
    DynamicModalComponent,
    DynamicTabComponent,
    DynamicTabConfig,
    ListColumnConfig, MutationState, ModalComponent, ConfirmDialogComponent
} from '@nexacore/shared';
import { ApiRegistryService } from '../../../core/services/api-registry.service';
import { ApiInventoryItemDto, ApiRegistryDto, ApiRegistryRequestDto, ApiRegistrySyncReportDto } from '../access-control.model';
import { API_REGISTRY_FIELDS, apiRegistryInitialValue } from './api-registry.model';
import { AuthorizedUiDirective, AuthorizationPolicyService, AuthorizationRevocationService } from '@nexacore/platform';
import { PageOperationService } from '../../../core/authorization/page-operation.service';

@Component({
    selector: 'app-api-registry-list',
    standalone: true,
    imports: [ButtonComponent, DynamicModalComponent, DynamicTabComponent, AuthorizedUiDirective,ModalComponent,ConfirmDialogComponent],
    templateUrl: './api-registry-list.component.html',
    styleUrl: './api-registry-list.component.scss'
})
export class ApiRegistryListComponent {
    private readonly service = inject(ApiRegistryService);
    private readonly policy=inject(AuthorizationPolicyService);
    private readonly revocation=inject(AuthorizationRevocationService);
    private readonly destroyRef=inject(DestroyRef);
    private readonly operations=inject(PageOperationService);
    protected readonly canManage=this.policy.actionAllowed('api-registry.manage');
    protected readonly canSync=this.policy.actionAllowed('api-registry.synchronize');
    protected readonly mutation=new MutationState();
    protected readonly error=signal<string|null>(null);

    protected readonly syncing = signal(false);
    protected readonly syncReport = signal<ApiRegistrySyncReportDto | null>(null);
    protected readonly syncPreviewOpen=signal(false);

    protected readonly editorOpen = signal(false);
    protected readonly editorFields = API_REGISTRY_FIELDS;
    protected readonly editorInitialValue = signal<Record<string, unknown>>({});
    private editingId: number | null = null;
    private editingRow:ApiRegistryDto|null=null;
    protected readonly sensitiveConfirmOpen=signal(false);
    private pendingSave:ApiRegistryRequestDto|null=null;

    private readonly tabsRef = viewChild<DynamicTabComponent>('tabsRef');

    constructor() {
        const editor=this.revocation.watch(this.canManage,()=>this.closeEditor());
        this.destroyRef.onDestroy(()=>editor.destroy());
    }

    protected readonly loadRegistered: DynamicListLoader<ApiRegistryDto> = params =>
        this.service.search(params.query,params.page-1,params.pageSize);

    protected readonly loadInventory: DynamicListLoader<ApiInventoryItemDto> = params =>
        this.service.inventorySearch(params.query,params.page-1,params.pageSize);

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
        if(!this.canSync() || !this.mutation.begin()) return;
        this.syncing.set(true);
        this.service.previewSync().subscribe({
            next: (report) => {
                this.syncing.set(false);
                this.mutation.succeed();
                this.syncReport.set(report);
                this.syncPreviewOpen.set(true);
            },
            error: error => { this.syncing.set(false); this.fail(error,'API registry synchronization failed.'); }
        });
    }

    protected openEditor(row: ApiRegistryDto | null): void {
        if(!this.canManage()) return;
        this.editingId = row?.id ?? null;
        this.editingRow=row;
        this.editorInitialValue.set(apiRegistryInitialValue(row));
        this.editorOpen.set(true);
    }

    protected closeEditor(): void {
        this.editorOpen.set(false);
    }

    protected saveEditor(value: Record<string, unknown>): void {
        if(!this.canManage() || !this.mutation.begin()) return;
        const request: ApiRegistryRequestDto = {
            id: this.editingId,
            version:this.editingRow?.version ?? null,
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
        if(this.isSensitiveChange(request)){ this.pendingSave=request; this.sensitiveConfirmOpen.set(true); this.mutation.reset(); return; }
        this.executeSave(request);
    }

    protected confirmSensitiveSave():void { const request=this.pendingSave; if(!request)return;
        this.sensitiveConfirmOpen.set(false); this.pendingSave=null; if(!this.mutation.begin())return; this.executeSave(request); }
    protected cancelSensitiveSave():void { this.sensitiveConfirmOpen.set(false); this.pendingSave=null; }
    protected applyPreview():void { const preview=this.syncReport(); if(!preview || preview.conflicted>0 || !this.mutation.begin())return;
        this.service.applySync(preview.previewVersion).subscribe({next:report=>{this.mutation.succeed();this.syncReport.set(report);this.syncPreviewOpen.set(false);this.tabsRef()?.reloadTab('registered');},
            error:error=>this.fail(error,'API registry synchronization apply failed.')}); }

    private executeSave(request:ApiRegistryRequestDto):void {
        this.service.saveStepUp(request).subscribe({next:() => {
            this.mutation.succeed();
            this.editorOpen.set(false);
            this.tabsRef()?.reloadTab('registered');
        },error:error=>this.fail(error,'API registry save was rejected.')});
    }
    private isSensitiveChange(request:ApiRegistryRequestDto):boolean { const row=this.editingRow;
        return !row || row.publicApi!==!!request.publicApi || row.clientAuthenticationRequirement!==request.clientAuthenticationRequirement
            || row.userAuthorizationRequirement!==request.userAuthorizationRequirement || row.dataScope!==request.dataScope; }

    private fail(error:unknown,fallback:string):void { const failure=this.operations.failure(error,fallback);
        this.mutation.failStructured(failure.message,failure.code,failure.traceId); this.error.set(this.operations.display(failure)); }
}
