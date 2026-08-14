import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { RoleDto, RoleRequestDto, VersionedAssignment } from '../../pages/access-control/users/user.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
    private readonly api = inject(ApiService);

    list(tenantId?: number | null): Observable<RoleDto[]> {
        return this.api.post<RoleDto[]>(ApiEndpoints.ROLE_LIST, tenantId ? { tenantId } : {});
    }
    detail(id: number): Observable<RoleDto> { return this.api.post<RoleDto>(ApiEndpoints.ROLE_DETAIL, { id }); }
    privilegeAssignments(id: number): Observable<VersionedAssignment<string>> {
        return this.api.post<VersionedAssignment<string>>(ApiEndpoints.ROLE_PRIVILEGE_ASSIGNMENTS, { id });
    }

    save(request: RoleRequestDto): Observable<RoleDto> {
        return this.api.post<RoleDto>(ApiEndpoints.ROLE_SAVE, request);
    }

    saveGlobal(request: RoleRequestDto): Observable<RoleDto> {
        return this.api.post<RoleDto>(ApiEndpoints.GLOBAL_ROLE_SAVE, request);
    }
}
