import { DropdownOption, FieldConfig } from '@nexacore/shared';

// Mirrors backend DTOs 1:1 (com.nexacore.systemmodule.workflow.definition.dto.*,
// com.nexacore.gatewaymodule.workflow.dto.*).

export type WorkflowEngineType = 'LOCAL' | 'FLOWABLE';
export type WorkflowDefinitionStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';
export type WorkflowStepType = 'START' | 'USER_TASK' | 'SYSTEM_TASK' | 'END';
export type WorkflowInstanceStatus = 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type WorkflowAssignmentPolicyType =
    'ROLE' | 'USER' | 'PRIVILEGE' | 'BRANCH_ROLE' | 'BUSINESS_ROLE' | 'REQUESTER_MANAGER' | 'SYSTEM';

export function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }
    return new Date(value).toLocaleString();
}

export interface WorkflowStepDto {
    id: number | null;
    stepCode: string;
    stepName: string;
    displayName: string | null;
    stepType: WorkflowStepType;
    terminal: boolean;
    sortOrder: number;
    active: boolean;
}

export interface WorkflowTransitionDto {
    id: number | null;
    fromStepCode: string;
    toStepCode: string;
    actionCode: string;
    actionName: string;
    requiredPrivilegeCode: string | null;
    requiresComment: boolean;
    requiresAttachment: boolean;
    autoAssignNextTask: boolean;
    active: boolean;
}

export interface WorkflowAssignmentPolicyDto {
    id: number | null;
    stepCode: string;
    policyType: WorkflowAssignmentPolicyType;
    roleId: number | null;
    userId: number | null;
    privilegeCode: string | null;
    branchScoped: boolean;
    businessScoped: boolean;
    expressionKey: string | null;
    active: boolean;
}

export interface WorkflowVersionDto {
    id: number | null;
    versionNumber: number;
    status: WorkflowDefinitionStatus;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    publishedAt: string | null;
    active: boolean;
    steps: WorkflowStepDto[];
    transitions: WorkflowTransitionDto[];
    assignmentPolicies: WorkflowAssignmentPolicyDto[];
}

export interface WorkflowDefinitionDto {
    id: number | null;
    workflowCode: string;
    workflowName: string;
    moduleId: number | null;
    submoduleId: number | null;
    featureId: number | null;
    subjectType: string;
    tenantId: number | null;
    businessId: number | null;
    engineType: WorkflowEngineType;
    active: boolean;
    versions: WorkflowVersionDto[];
}

export interface WorkflowDefinitionListRequestDto {
    activeOnly: boolean | null;
}

export interface WorkflowPublishRequestDto {
    workflowCode: string;
    subjectType: string;
    tenantId: number | null;
    businessId: number | null;
    versionNumber: number;
}

export interface WorkflowInstanceDto {
    id: number;
    workflowCode: string;
    subjectType: string;
    subjectId: string;
    tenantId: number | null;
    businessId: number | null;
    branchId: number | null;
    requesterUserId: number | null;
    currentStepCode: string | null;
    currentStepName: string | null;
    status: WorkflowInstanceStatus;
    startedAt: string;
    completedAt: string | null;
}

export interface WorkflowInstanceRequestDto {
    workflowInstanceId: number | null;
    subjectType: string | null;
    subjectId: string | null;
}

export interface WorkflowInstanceListRequestDto {
    workflowCode: string | null;
    subjectType: string | null;
    status: WorkflowInstanceStatus | null;
    businessId: number | null;
    branchId: number | null;
}

export interface WorkflowHistoryDto {
    id: number;
    workflowInstanceId: number;
    workflowTaskId: number | null;
    eventType: string;
    actionCode: string | null;
    fromStepCode: string | null;
    toStepCode: string | null;
    actorUserId: number | null;
    actorUsername: string | null;
    commentText: string | null;
    messageCode: string | null;
    safeContextJson: string | null;
    createdAt: string;
}

// ---- Dropdown options ----

export const WORKFLOW_ENGINE_TYPE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Local', value: 'LOCAL' },
    { label: 'Flowable', value: 'FLOWABLE' }
];

export const WORKFLOW_STEP_TYPE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Start', value: 'START' },
    { label: 'User Task', value: 'USER_TASK' },
    { label: 'System Task', value: 'SYSTEM_TASK' },
    { label: 'End', value: 'END' }
];

export const WORKFLOW_ASSIGNMENT_POLICY_TYPE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Role', value: 'ROLE' },
    { label: 'User', value: 'USER' },
    { label: 'Privilege', value: 'PRIVILEGE' },
    { label: 'Branch Role', value: 'BRANCH_ROLE' },
    { label: 'Business Role', value: 'BUSINESS_ROLE' },
    { label: 'Requester Manager', value: 'REQUESTER_MANAGER' },
    { label: 'System', value: 'SYSTEM' }
];

export const WORKFLOW_INSTANCE_STATUS_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Running', value: 'RUNNING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Failed', value: 'FAILED' }
];

// ---- Field configs ----

export const WORKFLOW_DEFINITION_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'workflowCode', label: 'Workflow Code', required: true },
    { type: 'text', key: 'workflowName', label: 'Workflow Name', required: true },
    { type: 'number', key: 'moduleId', label: 'Module Id' },
    { type: 'number', key: 'submoduleId', label: 'Submodule Id' },
    { type: 'number', key: 'featureId', label: 'Feature Id' },
    { type: 'text', key: 'subjectType', label: 'Subject Type', required: true },
    { type: 'number', key: 'tenantId', label: 'Tenant Id' },
    { type: 'number', key: 'businessId', label: 'Business Id' },
    { type: 'dropdown', key: 'engineType', label: 'Engine Type', options: WORKFLOW_ENGINE_TYPE_OPTIONS },
    { type: 'checkbox', key: 'active', label: 'Active' }
];

export const WORKFLOW_STEP_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'stepCode', label: 'Step Code', required: true },
    { type: 'text', key: 'stepName', label: 'Step Name', required: true },
    { type: 'text', key: 'displayName', label: 'Display Name' },
    { type: 'dropdown', key: 'stepType', label: 'Step Type', options: WORKFLOW_STEP_TYPE_OPTIONS },
    { type: 'checkbox', key: 'terminal', label: 'Terminal' },
    { type: 'number', key: 'sortOrder', label: 'Sort Order' },
    { type: 'checkbox', key: 'active', label: 'Active' }
];

/** fromStepCode/toStepCode are dropdowns of the current version's own steps (by
 * stepCode) rather than free text, to prevent typos breaking the code-reference
 * chain — sourced from the builder component's local stepsSignal, hence a
 * function rather than a static array. */
export function workflowTransitionFields(stepOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return [
        { type: 'dropdown', key: 'fromStepCode', label: 'From Step', options: stepOptions, required: true },
        { type: 'dropdown', key: 'toStepCode', label: 'To Step', options: stepOptions, required: true },
        { type: 'text', key: 'actionCode', label: 'Action Code', required: true },
        { type: 'text', key: 'actionName', label: 'Action Name', required: true },
        { type: 'text', key: 'requiredPrivilegeCode', label: 'Required Privilege Code' },
        { type: 'checkbox', key: 'requiresComment', label: 'Requires Comment' },
        { type: 'checkbox', key: 'requiresAttachment', label: 'Requires Attachment' },
        { type: 'checkbox', key: 'autoAssignNextTask', label: 'Auto Assign Next Task' },
        { type: 'checkbox', key: 'active', label: 'Active' }
    ];
}

/** stepCode dropdown sourced the same way as workflowTransitionFields' — see there.
 * roleId/userId stay plain number inputs: no role/user picker endpoint confirmed
 * available (same pragmatic call License's entitlement moduleId/submoduleId/featureId
 * fields already made). */
export function workflowAssignmentPolicyFields(stepOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return [
        { type: 'dropdown', key: 'stepCode', label: 'Step', options: stepOptions, required: true },
        { type: 'dropdown', key: 'policyType', label: 'Policy Type', options: WORKFLOW_ASSIGNMENT_POLICY_TYPE_OPTIONS, required: true },
        { type: 'number', key: 'roleId', label: 'Role Id' },
        { type: 'number', key: 'userId', label: 'User Id' },
        { type: 'text', key: 'privilegeCode', label: 'Privilege Code' },
        { type: 'checkbox', key: 'branchScoped', label: 'Branch Scoped' },
        { type: 'checkbox', key: 'businessScoped', label: 'Business Scoped' },
        { type: 'text', key: 'expressionKey', label: 'Expression Key' },
        { type: 'checkbox', key: 'active', label: 'Active' }
    ];
}

// ---- Initial values ----

export function workflowDefinitionInitialValue(row: WorkflowDefinitionDto | null): Record<string, unknown> {
    if (!row) {
        return { engineType: 'LOCAL', active: true };
    }
    return {
        workflowCode: row.workflowCode, workflowName: row.workflowName, moduleId: row.moduleId,
        submoduleId: row.submoduleId, featureId: row.featureId, subjectType: row.subjectType,
        tenantId: row.tenantId, businessId: row.businessId, engineType: row.engineType, active: row.active
    };
}

export function workflowStepInitialValue(row: WorkflowStepDto | null): Record<string, unknown> {
    if (!row) {
        return { stepType: 'USER_TASK', terminal: false, sortOrder: 100, active: true };
    }
    return {
        stepCode: row.stepCode, stepName: row.stepName, displayName: row.displayName ?? '',
        stepType: row.stepType, terminal: row.terminal, sortOrder: row.sortOrder, active: row.active
    };
}

export function workflowTransitionInitialValue(row: WorkflowTransitionDto | null): Record<string, unknown> {
    if (!row) {
        return { requiresComment: false, requiresAttachment: false, autoAssignNextTask: false, active: true };
    }
    return {
        fromStepCode: row.fromStepCode, toStepCode: row.toStepCode, actionCode: row.actionCode,
        actionName: row.actionName, requiredPrivilegeCode: row.requiredPrivilegeCode ?? '',
        requiresComment: row.requiresComment, requiresAttachment: row.requiresAttachment,
        autoAssignNextTask: row.autoAssignNextTask, active: row.active
    };
}

export function workflowAssignmentPolicyInitialValue(row: WorkflowAssignmentPolicyDto | null): Record<string, unknown> {
    if (!row) {
        return { policyType: 'ROLE', branchScoped: false, businessScoped: false, active: true };
    }
    return {
        stepCode: row.stepCode, policyType: row.policyType, roleId: row.roleId, userId: row.userId,
        privilegeCode: row.privilegeCode ?? '', branchScoped: row.branchScoped, businessScoped: row.businessScoped,
        expressionKey: row.expressionKey ?? '', active: row.active
    };
}
