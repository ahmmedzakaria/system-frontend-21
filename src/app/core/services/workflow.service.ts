import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import {
    WorkflowDefinitionDto,
    WorkflowDefinitionListRequestDto,
    WorkflowHistoryDto,
    WorkflowInstanceDto,
    WorkflowInstanceListRequestDto,
    WorkflowInstanceRequestDto,
    WorkflowPublishRequestDto
} from '../../pages/workflow/workflow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
    private readonly api = inject(ApiService);

    definitionList(activeOnly: boolean | null = true): Observable<WorkflowDefinitionDto[]> {
        const request: WorkflowDefinitionListRequestDto = { activeOnly };
        return this.api.post<WorkflowDefinitionDto[]>(ApiEndpoints.WORKFLOW_DEFINITION_LIST, request);
    }

    definitionSave(request: WorkflowDefinitionDto): Observable<WorkflowDefinitionDto> {
        return this.api.post<WorkflowDefinitionDto>(ApiEndpoints.WORKFLOW_DEFINITION_SAVE, request);
    }

    definitionPublish(request: WorkflowPublishRequestDto): Observable<WorkflowDefinitionDto> {
        return this.api.post<WorkflowDefinitionDto>(ApiEndpoints.WORKFLOW_DEFINITION_PUBLISH, request);
    }

    definitionRetire(request: WorkflowPublishRequestDto): Observable<WorkflowDefinitionDto> {
        return this.api.post<WorkflowDefinitionDto>(ApiEndpoints.WORKFLOW_DEFINITION_RETIRE, request);
    }

    instanceList(filters: Partial<WorkflowInstanceListRequestDto> = {}): Observable<WorkflowInstanceDto[]> {
        const request: WorkflowInstanceListRequestDto = {
            workflowCode: filters.workflowCode ?? null,
            subjectType: filters.subjectType ?? null,
            status: filters.status ?? null,
            businessId: filters.businessId ?? null,
            branchId: filters.branchId ?? null
        };
        return this.api.post<WorkflowInstanceDto[]>(ApiEndpoints.WORKFLOW_INSTANCE_LIST, request);
    }

    instanceDetail(request: WorkflowInstanceRequestDto): Observable<WorkflowInstanceDto> {
        return this.api.post<WorkflowInstanceDto>(ApiEndpoints.WORKFLOW_INSTANCE_DETAIL, request);
    }

    instanceHistory(workflowInstanceId: number): Observable<WorkflowHistoryDto[]> {
        return this.api.post<WorkflowHistoryDto[]>(ApiEndpoints.WORKFLOW_INSTANCE_HISTORY, { workflowInstanceId });
    }
}
