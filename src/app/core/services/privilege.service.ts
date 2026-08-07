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
}
