import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { of } from 'rxjs';
import {
    ButtonComponent,
    DynamicListLoader,
    DynamicTabComponent,
    DynamicTabConfig,
    ListColumnConfig,
    ModalComponent,
    StatusTone
} from '@nexacore/shared';
import { AuthorizedUiDirective } from '@nexacore/platform';
import { WorkflowService } from '../../core/services/workflow.service';
import { WorkflowDefinitionBuilderComponent } from './workflow-definition-builder.component';
import {
    WorkflowDefinitionDto,
    WorkflowHistoryDto,
    WorkflowInstanceDto,
    WorkflowInstanceStatus,
    formatDateTime
} from './workflow.model';

type Tab = 'definitions' | 'instances';

@Component({
    selector: 'app-workflow-list',
    standalone: true,
    imports: [ButtonComponent, DynamicTabComponent, ModalComponent, AuthorizedUiDirective, WorkflowDefinitionBuilderComponent],
    templateUrl: './workflow-list.component.html',
    styleUrl: './workflow-list.component.scss'
})
export class WorkflowListComponent {
    private readonly service = inject(WorkflowService);
    private readonly tabsRef = viewChild<DynamicTabComponent>('tabsRef');

    protected readonly formatDateTime = formatDateTime;
    protected readonly activeTabIndex = signal(0);
    protected readonly activeTabKey = computed<Tab>(() => this.tabs()[this.activeTabIndex()]?.key as Tab);

    protected readonly definitions = signal<WorkflowDefinitionDto[]>([]);
    protected readonly instances = signal<WorkflowInstanceDto[]>([]);

    constructor() {
        this.reloadDefinitions();
        this.reloadInstances();
    }

    private reloadDefinitions(): void {
        this.service.definitionList(null).subscribe((rows) => {
            this.definitions.set(rows);
            this.tabsRef()?.reloadTab('definitions');
        });
    }

    private reloadInstances(): void {
        this.service.instanceList().subscribe((rows) => {
            this.instances.set(rows);
            this.tabsRef()?.reloadTab('instances');
        });
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

    protected readonly loadDefinitions = this.makeLoader(this.definitions, (row) => `${row.workflowCode} ${row.workflowName}`);
    protected readonly loadInstances = this.makeLoader(this.instances, (row) => `${row.workflowCode} ${row.subjectType} ${row.subjectId}`);

    private latestVersionStatus(row: WorkflowDefinitionDto): string {
        const versions = [...row.versions].sort((a, b) => b.versionNumber - a.versionNumber);
        return versions[0]?.status ?? '—';
    }

    private instanceStatusTone(status: WorkflowInstanceStatus): StatusTone {
        if (status === 'COMPLETED') return 'verified';
        if (status === 'RUNNING') return 'pending';
        if (status === 'FAILED' || status === 'CANCELLED') return 'rejected';
        return 'draft';
    }

    protected readonly definitionColumns: ListColumnConfig<WorkflowDefinitionDto>[] = [
        { key: 'workflowCode', header: 'Code' },
        { key: 'workflowName', header: 'Name' },
        { key: 'subjectType', header: 'Subject Type' },
        { key: 'engineType', header: 'Engine' },
        { key: 'latestVersion', header: 'Latest Version', format: (row) => this.latestVersionStatus(row) },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', permissionKey: 'workflow.manage', onClick: (row) => this.openDefinitionBuilder(row) }]
        }
    ];

    protected readonly instanceColumns: ListColumnConfig<WorkflowInstanceDto>[] = [
        { key: 'workflowCode', header: 'Code' },
        { key: 'subjectType', header: 'Subject Type' },
        { key: 'subjectId', header: 'Subject Id' },
        { key: 'status', header: 'Status', type: 'badge', status: (row) => this.instanceStatusTone(row.status), label: (row) => row.status },
        { key: 'requesterUserId', header: 'Requester', format: (row) => row.requesterUserId?.toString() ?? '—' },
        { key: 'startedAt', header: 'Started', format: (row) => formatDateTime(row.startedAt) },
        { key: 'completedAt', header: 'Completed', format: (row) => formatDateTime(row.completedAt) },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'eye', label: 'View', onClick: (row) => this.openInstanceDetail(row) }]
        }
    ];

    protected readonly tabs = computed<DynamicTabConfig[]>(() => [
        {
            key: 'definitions', label: 'Definitions',
            columns: this.definitionColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadDefinitions as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search by code or name…',
            emptyTitle: 'No workflow definitions yet',
            emptyMessage: 'Create the first workflow definition to get started.'
        },
        {
            key: 'instances', label: 'Instances',
            columns: this.instanceColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadInstances as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search by code, subject type, or subject id…',
            emptyTitle: 'No workflow instances yet',
            emptyMessage: 'Nothing has started a workflow yet — this is expected until a business module triggers one.'
        }
    ]);

    // ---- Definition builder ----

    protected readonly editingDefinition = signal<WorkflowDefinitionDto | null>(null);
    protected readonly editingIsNew = signal(false);

    private blankDefinition(): WorkflowDefinitionDto {
        return {
            id: null, workflowCode: '', workflowName: '', moduleId: null, submoduleId: null, featureId: null,
            subjectType: '', tenantId: null, businessId: null, engineType: 'LOCAL', active: true, versions: []
        };
    }

    protected openDefinitionBuilder(row: WorkflowDefinitionDto | null): void {
        this.editingIsNew.set(row === null);
        this.editingDefinition.set(row ?? this.blankDefinition());
    }
    protected closeDefinitionBuilder(): void {
        this.editingDefinition.set(null);
    }
    protected onDefinitionSaved(): void {
        this.editingDefinition.set(null);
        this.reloadDefinitions();
    }

    // ---- Instance detail ----

    protected readonly instanceDetail = signal<WorkflowInstanceDto | null>(null);
    protected readonly instanceHistory = signal<WorkflowHistoryDto[]>([]);

    protected openInstanceDetail(row: WorkflowInstanceDto): void {
        this.instanceDetail.set(row);
        this.instanceHistory.set([]);
        this.service.instanceDetail({ workflowInstanceId: row.id, subjectType: null, subjectId: null })
            .subscribe((detail) => this.instanceDetail.set(detail));
        this.service.instanceHistory(row.id)
            .subscribe((history) => this.instanceHistory.set([...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
    }
    protected closeInstanceDetail(): void {
        this.instanceDetail.set(null);
        this.instanceHistory.set([]);
    }
}
