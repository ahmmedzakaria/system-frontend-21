import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { RoleDto, RoleRequestDto } from '../../pages/access-control/users/user.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
    private readonly api = inject(ApiService);

    list(): Observable<RoleDto[]> {
        return this.api.post<RoleDto[]>(ApiEndpoints.ROLE_LIST);
    }

    save(request: RoleRequestDto): Observable<RoleDto> {
        return this.api.post<RoleDto>(ApiEndpoints.ROLE_SAVE, request);
    }
}
