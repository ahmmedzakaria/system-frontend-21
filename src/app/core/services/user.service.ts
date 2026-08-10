import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { UserDto, UserRequestDto, UserRoleAssignmentRequestDto } from '../../pages/access-control/users/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly api = inject(ApiService);

    list(): Observable<UserDto[]> {
        return this.api.post<UserDto[]>(ApiEndpoints.USER_LIST);
    }

    save(request: UserRequestDto): Observable<UserDto> {
        return this.api.post<UserDto>(ApiEndpoints.USER_SAVE, request);
    }

    /** Full-replace: the given role ids become the user's entire role set. */
    assignRoles(userId: number, roleIds: number[]): Observable<void> {
        const request: UserRoleAssignmentRequestDto = { userId, roleIds };
        return this.api.post<void>(ApiEndpoints.USER_ASSIGN_ROLES, request);
    }
}
