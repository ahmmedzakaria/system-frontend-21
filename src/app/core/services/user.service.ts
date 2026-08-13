import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { RoleDto, UserDto, UserRequestDto, UserRoleAssignmentRequestDto, UserScopeAssignmentDto, UserScopeAssignmentRequestDto, VersionedAssignment } from '../../pages/access-control/users/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly api = inject(ApiService);

    list(): Observable<UserDto[]> {
        return this.api.post<UserDto[]>(ApiEndpoints.USER_LIST);
    }
    detail(id: number): Observable<UserDto> { return this.api.post<UserDto>(ApiEndpoints.USER_DETAIL, { id }); }
    roleAssignments(id: number): Observable<VersionedAssignment<RoleDto>> {
        return this.api.post<VersionedAssignment<RoleDto>>(ApiEndpoints.USER_ROLE_ASSIGNMENTS, { id });
    }

    save(request: UserRequestDto): Observable<UserDto> {
        return this.api.post<UserDto>(ApiEndpoints.USER_SAVE, request);
    }

    /** Full-replace: the given role ids become the user's entire role set. */
    assignRoles(userId: number, roleIds: number[], version: string): Observable<void> {
        const request: UserRoleAssignmentRequestDto = { userId, roleIds, version };
        return this.api.post<void>(ApiEndpoints.USER_ASSIGN_ROLES, request);
    }

    scopeAssignments(userId: number): Observable<VersionedAssignment<UserScopeAssignmentDto>> {
        return this.api.post<VersionedAssignment<UserScopeAssignmentDto>>(ApiEndpoints.USER_SCOPE_ASSIGNMENTS, { userId });
    }

    replaceScopeAssignments(userId: number, scopeAssignments: UserScopeAssignmentDto[], version:string): Observable<void> {
        const request: UserScopeAssignmentRequestDto = { userId, scopeAssignments, version };
        return this.api.post<void>(ApiEndpoints.USER_REPLACE_SCOPE_ASSIGNMENTS, request);
    }
}
