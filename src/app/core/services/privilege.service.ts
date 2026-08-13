import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { PrivilegeDto, PrivilegeRequestDto, SubMenuDto, SubMenuRequestDto } from '../../pages/access-control/privileges/privileges.model';

@Injectable({ providedIn: 'root' })
export class PrivilegeService {
    private readonly api = inject(ApiService);

    list(): Observable<PrivilegeDto[]> {
        return this.api.post<PrivilegeDto[]>(ApiEndpoints.PRIVILEGE_LIST);
    }

    save(request: PrivilegeRequestDto): Observable<PrivilegeDto> {
        return this.api.post<PrivilegeDto>(ApiEndpoints.PRIVILEGE_SAVE, request);
    }

    subMenuList(): Observable<SubMenuDto[]> {
        return this.api.post<SubMenuDto[]>(ApiEndpoints.SUB_MENU_LIST);
    }

    subMenuSave(request: SubMenuRequestDto): Observable<SubMenuDto> {
        return this.api.post<SubMenuDto>(ApiEndpoints.SUB_MENU_SAVE, request);
    }

    /** Full-replace: the given privilege codes become the role's entire privilege set. */
    assignToRole(roleId: number, privilegeCodes: string[], version: string): Observable<void> {
        return this.api.post<void>(ApiEndpoints.PRIVILEGE_ASSIGN_ROLE, { roleId, privilegeCodes, version });
    }

    roleCodes(roleId: number): Observable<string[]> {
        return this.api.post<string[]>(ApiEndpoints.PRIVILEGE_ROLE_CODES, { roleId });
    }
}
