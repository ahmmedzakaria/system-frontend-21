import { Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { of } from 'rxjs';
import {
    ButtonComponent,
    DropdownOption,
    DynamicFormComponent,
    DynamicListComponent,
    DynamicListLoader,
    ListColumnConfig,
    ModalComponent
} from '@nexacore/shared';
import { AuthorizedUiDirective } from '@nexacore/platform';
import { WorkflowService } from '../../core/services/workflow.service';
import {
    WORKFLOW_STEP_FIELDS,
    WorkflowAssignmentPolicyDto,
    WorkflowAssignmentPolicyType,
    WorkflowDefinitionDto,
    WorkflowEngineType,
    WorkflowPublishRequestDto,
    WorkflowStepDto,
    WorkflowStepType,
    WorkflowTransitionDto,
    WorkflowVersionDto,
    WORKFLOW_DEFINITION_FIELDS,
    formatDateTime,
    workflowAssignmentPolicyFields,
    workflowAssignmentPolicyInitialValue,
    workflowDefinitionInitialValue,
    workflowStepInitialValue,
    workflowTransitionFields,
    workflowTransitionInitialValue
} from './workflow.model';

/** The Definition Builder view — swapped in over the list in-page (not a new
 * route) when editing/creating a definition. Version handling is deliberately
 * narrow: only the latest DRAFT (if any) is editable here; PUBLISHED/RETIRED
 * versions are read-only history. Steps/Transitions/Assignment Policies are
 * local signal arrays accumulated on the draft and submitted together in one
 * `saveDefinition()` call — /definition/save expects the whole nested tree in
 * one atomic request, unlike Navigation Tree's per-node saves. */
@Component({
    selector: 'app-workflow-definition-builder',
    standalone: true,
    imports: [ButtonComponent, DynamicFormComponent, DynamicListComponent, ModalComponent, AuthorizedUiDirective],
    templateUrl: './workflow-definition-builder.component.html',
    styleUrl: './workflow-definition-builder.component.scss'
})
export class WorkflowDefinitionBuilderComponent {
    readonly definition = input.required<WorkflowDefinitionDto>();
    readonly isNew = input(false);
    readonly closed = output<void>();
    readonly saved = output<void>();

    private readonly service = inject(WorkflowService);

    protected readonly formatDateTime = formatDateTime;
    protected readonly headerFields = WORKFLOW_DEFINITION_FIELDS;
    protected readonly headerInitialValue = signal<Record<string, unknown>>({});

    protected readonly versions = signal<WorkflowVersionDto[]>([]);
    protected readonly currentVersion = signal<WorkflowVersionDto | null>(null);

    protected readonly stepsSignal = signal<WorkflowStepDto[]>([]);
    protected readonly transitionsSignal = signal<WorkflowTransitionDto[]>([]);
    protected readonly policiesSignal = signal<WorkflowAssignmentPolicyDto[]>([]);

    protected readonly stepOptions = computed<DropdownOption<unknown>[]>(() =>
        this.stepsSignal().map((step) => ({ label: `${step.stepName} (${step.stepCode})`, value: step.stepCode })));

    protected readonly stepFields = WORKFLOW_STEP_FIELDS;
    protected readonly transitionFieldsComputed = computed(() => workflowTransitionFields(this.stepOptions()));
    protected readonly policyFieldsComputed = computed(() => workflowAssignmentPolicyFields(this.stepOptions()));

    protected readonly canPublish = computed(() => this.currentVersion()?.status === 'DRAFT' && this.stepsSignal().length > 0);

    /** Initialized exactly once from the `definition` input — this component is
     * only ever mounted for the duration of one edit session (the host toggles
     * it via `@if`, recreating the instance for the next), so there is no
     * "input changed while mounted" case to react to. Reading a required input
     * directly in the constructor is disallowed by the compiler (NG8118),
     * hence the guarded `effect()` instead. */
    private initialized = false;

    constructor() {
        effect(() => {
            const def = this.definition();
            if (this.initialized) {
                return;
            }
            this.initialized = true;
            this.headerInitialValue.set(workflowDefinitionInitialValue(this.isNew() ? null : def));
            const sortedVersions = [...def.versions].sort((a, b) => b.versionNumber - a.versionNumber);
            this.versions.set(sortedVersions);
            const draft = sortedVersions.find((v) => v.status === 'DRAFT') ?? null;
            this.loadVersionIntoEditor(draft);
        });
    }

    private loadVersionIntoEditor(version: WorkflowVersionDto | null): void {
        this.currentVersion.set(version);
        this.stepsSignal.set(version ? [...version.steps] : []);
        this.transitionsSignal.set(version ? [...version.transitions] : []);
        this.policiesSignal.set(version ? [...version.assignmentPolicies] : []);
    }

    protected startNewDraft(): void {
        const maxVersion = this.versions().reduce((max, v) => Math.max(max, v.versionNumber), 0);
        const draft: WorkflowVersionDto = {
            id: null, versionNumber: maxVersion + 1, status: 'DRAFT', effectiveFrom: null, effectiveTo: null,
            publishedAt: null, active: true, steps: [], transitions: [], assignmentPolicies: []
        };
        this.versions.update((list) => [draft, ...list]);
        this.loadVersionIntoEditor(draft);
    }

    protected close(): void {
        this.closed.emit();
    }

    // ---- Header / save ----

    protected saveDefinition(value: Record<string, unknown>): void {
        const draft = this.currentVersion();
        const versions = draft
            ? this.versions().map((v) => v === draft
                ? { ...draft, steps: this.stepsSignal(), transitions: this.transitionsSignal(), assignmentPolicies: this.policiesSignal() }
                : v)
            : this.versions();
        const request: WorkflowDefinitionDto = {
            id: this.definition().id,
            workflowCode: (value['workflowCode'] as string) || '',
            workflowName: value['workflowName'] as string,
            moduleId: (value['moduleId'] as number) ?? null,
            submoduleId: (value['submoduleId'] as number) ?? null,
            featureId: (value['featureId'] as number) ?? null,
            subjectType: (value['subjectType'] as string) || '',
            tenantId: (value['tenantId'] as number) ?? null,
            businessId: (value['businessId'] as number) ?? null,
            engineType: value['engineType'] as WorkflowEngineType,
            active: !!value['active'],
            versions
        };
        this.service.definitionSave(request).subscribe(() => this.saved.emit());
    }

    protected publishDraft(): void {
        const draft = this.currentVersion();
        if (!draft) {
            return;
        }
        const request: WorkflowPublishRequestDto = {
            workflowCode: this.definition().workflowCode,
            subjectType: this.definition().subjectType,
            tenantId: this.definition().tenantId,
            businessId: this.definition().businessId,
            versionNumber: draft.versionNumber
        };
        this.service.definitionPublish(request).subscribe(() => this.saved.emit());
    }

    protected retireVersion(version: WorkflowVersionDto): void {
        const request: WorkflowPublishRequestDto = {
            workflowCode: this.definition().workflowCode,
            subjectType: this.definition().subjectType,
            tenantId: this.definition().tenantId,
            businessId: this.definition().businessId,
            versionNumber: version.versionNumber
        };
        this.service.definitionRetire(request).subscribe(() => this.saved.emit());
    }

    // ---- Steps ----

    private readonly stepListRef = viewChild<DynamicListComponent<WorkflowStepDto>>('stepList');
    protected readonly stepEditorOpen = signal(false);
    protected readonly stepEditorInitialValue = signal<Record<string, unknown>>({});
    private editingStepIndex: number | null = null;

    protected readonly loadSteps: DynamicListLoader<WorkflowStepDto> = (params) => {
        const rows = this.stepsSignal();
        const query = params.query.trim().toLowerCase();
        const filtered = query ? rows.filter((r) => `${r.stepCode} ${r.stepName}`.toLowerCase().includes(query)) : rows;
        const start = (params.page - 1) * params.pageSize;
        return of({ items: filtered.slice(start, start + params.pageSize), total: filtered.length });
    };

    protected readonly stepColumns: ListColumnConfig<WorkflowStepDto>[] = [
        { key: 'stepCode', header: 'Code' },
        { key: 'stepName', header: 'Name' },
        { key: 'stepType', header: 'Type' },
        { key: 'terminal', header: 'Terminal', type: 'badge', status: (row) => (row.terminal ? 'verified' : 'draft') },
        { key: 'sortOrder', header: 'Order' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', onClick: (row) => this.openStepEditor(row) }]
        }
    ];

    protected openStepEditor(row: WorkflowStepDto | null): void {
        this.editingStepIndex = row ? this.stepsSignal().indexOf(row) : null;
        this.stepEditorInitialValue.set(workflowStepInitialValue(row));
        this.stepEditorOpen.set(true);
    }
    protected closeStepEditor(): void {
        this.stepEditorOpen.set(false);
    }
    protected saveStepEditor(value: Record<string, unknown>): void {
        const index = this.editingStepIndex;
        const step: WorkflowStepDto = {
            id: index !== null ? this.stepsSignal()[index].id : null,
            stepCode: (value['stepCode'] as string) || '',
            stepName: value['stepName'] as string,
            displayName: (value['displayName'] as string) || null,
            stepType: value['stepType'] as WorkflowStepType,
            terminal: !!value['terminal'],
            sortOrder: (value['sortOrder'] as number) ?? 100,
            active: !!value['active']
        };
        this.stepsSignal.update((list) => {
            const next = [...list];
            index !== null ? next[index] = step : next.push(step);
            return next;
        });
        this.stepEditorOpen.set(false);
        this.stepListRef()?.reload();
    }

    // ---- Transitions ----

    private readonly transitionListRef = viewChild<DynamicListComponent<WorkflowTransitionDto>>('transitionList');
    protected readonly transitionEditorOpen = signal(false);
    protected readonly transitionEditorInitialValue = signal<Record<string, unknown>>({});
    private editingTransitionIndex: number | null = null;

    protected readonly loadTransitions: DynamicListLoader<WorkflowTransitionDto> = (params) => {
        const rows = this.transitionsSignal();
        const query = params.query.trim().toLowerCase();
        const filtered = query
            ? rows.filter((r) => `${r.fromStepCode} ${r.toStepCode} ${r.actionCode}`.toLowerCase().includes(query))
            : rows;
        const start = (params.page - 1) * params.pageSize;
        return of({ items: filtered.slice(start, start + params.pageSize), total: filtered.length });
    };

    protected readonly transitionColumns: ListColumnConfig<WorkflowTransitionDto>[] = [
        { key: 'fromStepCode', header: 'From' },
        { key: 'toStepCode', header: 'To' },
        { key: 'actionCode', header: 'Action Code' },
        { key: 'actionName', header: 'Action Name' },
        { key: 'requiresComment', header: 'Requires Comment', type: 'badge', status: (row) => (row.requiresComment ? 'verified' : 'draft') },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', onClick: (row) => this.openTransitionEditor(row) }]
        }
    ];

    protected openTransitionEditor(row: WorkflowTransitionDto | null): void {
        this.editingTransitionIndex = row ? this.transitionsSignal().indexOf(row) : null;
        this.transitionEditorInitialValue.set(workflowTransitionInitialValue(row));
        this.transitionEditorOpen.set(true);
    }
    protected closeTransitionEditor(): void {
        this.transitionEditorOpen.set(false);
    }
    protected saveTransitionEditor(value: Record<string, unknown>): void {
        const index = this.editingTransitionIndex;
        const transition: WorkflowTransitionDto = {
            id: index !== null ? this.transitionsSignal()[index].id : null,
            fromStepCode: value['fromStepCode'] as string,
            toStepCode: value['toStepCode'] as string,
            actionCode: (value['actionCode'] as string) || '',
            actionName: value['actionName'] as string,
            requiredPrivilegeCode: (value['requiredPrivilegeCode'] as string) || null,
            requiresComment: !!value['requiresComment'],
            requiresAttachment: !!value['requiresAttachment'],
            autoAssignNextTask: !!value['autoAssignNextTask'],
            active: !!value['active']
        };
        this.transitionsSignal.update((list) => {
            const next = [...list];
            index !== null ? next[index] = transition : next.push(transition);
            return next;
        });
        this.transitionEditorOpen.set(false);
        this.transitionListRef()?.reload();
    }

    // ---- Assignment Policies ----

    private readonly policyListRef = viewChild<DynamicListComponent<WorkflowAssignmentPolicyDto>>('policyList');
    protected readonly policyEditorOpen = signal(false);
    protected readonly policyEditorInitialValue = signal<Record<string, unknown>>({});
    private editingPolicyIndex: number | null = null;

    protected readonly loadPolicies: DynamicListLoader<WorkflowAssignmentPolicyDto> = (params) => {
        const rows = this.policiesSignal();
        const query = params.query.trim().toLowerCase();
        const filtered = query ? rows.filter((r) => `${r.stepCode} ${r.policyType}`.toLowerCase().includes(query)) : rows;
        const start = (params.page - 1) * params.pageSize;
        return of({ items: filtered.slice(start, start + params.pageSize), total: filtered.length });
    };

    protected readonly policyColumns: ListColumnConfig<WorkflowAssignmentPolicyDto>[] = [
        { key: 'stepCode', header: 'Step' },
        { key: 'policyType', header: 'Type' },
        { key: 'roleId', header: 'Role Id', format: (row) => row.roleId?.toString() ?? '—' },
        { key: 'userId', header: 'User Id', format: (row) => row.userId?.toString() ?? '—' },
        { key: 'privilegeCode', header: 'Privilege Code', format: (row) => row.privilegeCode ?? '—' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', onClick: (row) => this.openPolicyEditor(row) }]
        }
    ];

    protected openPolicyEditor(row: WorkflowAssignmentPolicyDto | null): void {
        this.editingPolicyIndex = row ? this.policiesSignal().indexOf(row) : null;
        this.policyEditorInitialValue.set(workflowAssignmentPolicyInitialValue(row));
        this.policyEditorOpen.set(true);
    }
    protected closePolicyEditor(): void {
        this.policyEditorOpen.set(false);
    }
    protected savePolicyEditor(value: Record<string, unknown>): void {
        const index = this.editingPolicyIndex;
        const policy: WorkflowAssignmentPolicyDto = {
            id: index !== null ? this.policiesSignal()[index].id : null,
            stepCode: value['stepCode'] as string,
            policyType: value['policyType'] as WorkflowAssignmentPolicyType,
            roleId: (value['roleId'] as number) ?? null,
            userId: (value['userId'] as number) ?? null,
            privilegeCode: (value['privilegeCode'] as string) || null,
            branchScoped: !!value['branchScoped'],
            businessScoped: !!value['businessScoped'],
            expressionKey: (value['expressionKey'] as string) || null,
            active: !!value['active']
        };
        this.policiesSignal.update((list) => {
            const next = [...list];
            index !== null ? next[index] = policy : next.push(policy);
            return next;
        });
        this.policyEditorOpen.set(false);
        this.policyListRef()?.reload();
    }
}
