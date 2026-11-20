import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import {
    ClientApplicationDto,
    ClientApplicationRequestDto,
    ClientAdministrationDetailDto,
    ClientScopeAssignmentDto,
    ClientPermissionAssignmentRequestDto,
    GeneratedClientCredentialDto
} from '../../pages/access-control/access-control.model';

@Injectable({ providedIn: 'root' })
export class ClientApplicationService {
    private readonly api = inject(ApiService);

    list(): Observable<ClientApplicationDto[]> {
        return this.api.post<ClientApplicationDto[]>(ApiEndpoints.CLIENT_APP_LIST);
    }

    detail(clientApplicationId: number, tenantId: number): Observable<ClientAdministrationDetailDto> {
        return this.api.post<ClientAdministrationDetailDto>(ApiEndpoints.CLIENT_APP_DETAIL, { clientApplicationId, tenantId });
    }

    save(request: ClientApplicationRequestDto): Observable<ClientApplicationDto> {
        return this.api.post<ClientApplicationDto>(ApiEndpoints.CLIENT_APP_SAVE, request);
    }

    rotateApiKey(clientApplicationId: number): Observable<GeneratedClientCredentialDto> {
        return this.api.post<GeneratedClientCredentialDto>(ApiEndpoints.CLIENT_APP_ROTATE_API_KEY, { clientApplicationId });
    }

    apiPermissions(clientApplicationId: number): Observable<Set<number>> {
        return this.api.post<number[]>(ApiEndpoints.CLIENT_APP_API_PERMISSIONS, { clientApplicationId })
            .pipe(map(ids => new Set(ids)));
    }

    featurePermissions(clientApplicationId: number, tenantId: number): Observable<Set<string>> {
        return this.api.post<string[]>(ApiEndpoints.CLIENT_APP_FEATURE_PERMISSIONS, { clientApplicationId, tenantId })
            .pipe(map(codes => new Set(codes)));
    }

    /** Full-replace: the given set becomes the client's entire API permission set. */
    assignApiPermissions(clientApplicationId: number, apiRegistryIds: number[]): Observable<void> {
        const request: ClientPermissionAssignmentRequestDto = { clientApplicationId, apiRegistryIds };
        return this.api.post<void>(ApiEndpoints.CLIENT_APP_ASSIGN_API_PERMISSIONS, request);
    }

    /** Full-replace: the given set becomes the client's entire feature (privilege) permission set. */
    assignFeaturePermissions(clientApplicationId: number, tenantId: number, privilegeCodes: string[]): Observable<void> {
        const request: ClientPermissionAssignmentRequestDto = { clientApplicationId, tenantId, privilegeCodes };
        return this.api.post<void>(ApiEndpoints.CLIENT_APP_ASSIGN_FEATURE_PERMISSIONS, request);
    }

    /** Full-replace: normalized tuples become the client's entire scope. */
    assignScopes(clientApplicationId: number, scopeAssignments: ClientScopeAssignmentDto[], version:string): Observable<void> {
        const request: ClientPermissionAssignmentRequestDto = { clientApplicationId, scopeAssignments, version };
        return this.api.post<void>(ApiEndpoints.CLIENT_APP_ASSIGN_TENANTS, request);
    }
}
