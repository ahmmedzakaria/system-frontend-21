import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { PrivilegeDto, PrivilegeRequestDto, PrivilegeImpactDto, PrivilegeDeactivateResultDto, PrivilegeFeatureDefinitionDto } from '../../pages/access-control/privileges/privileges.model';

@Injectable({ providedIn: 'root' })
export class PrivilegeService {
    private readonly api = inject(ApiService);

    list(): Observable<PrivilegeDto[]> {
        return this.api.post<PrivilegeDto[]>(ApiEndpoints.PRIVILEGE_LIST);
    }
    search(query:string,page:number,pageSize:number):Observable<{items:PrivilegeDto[];total:number}> {
        return this.api.post<{items:PrivilegeDto[];total:number}>(ApiEndpoints.PRIVILEGE_SEARCH,{query,page,pageSize});
    }
    definitions(): Observable<PrivilegeFeatureDefinitionDto[]> {
        return this.api.post<PrivilegeFeatureDefinitionDto[]>(ApiEndpoints.PRIVILEGE_DEFINITIONS);
    }

    save(request: PrivilegeRequestDto): Observable<PrivilegeDto> {
        return this.api.post<PrivilegeDto>(ApiEndpoints.PRIVILEGE_SAVE, request);
    }

    /** Full-replace: the given privilege codes become the role's entire privilege set. */
    assignToRole(roleId: number, privilegeCodes: string[], version: string): Observable<void> {
        return this.api.post<void>(ApiEndpoints.PRIVILEGE_ASSIGN_ROLE, { roleId, privilegeCodes, version });
    }

    roleCodes(roleId: number): Observable<string[]> {
        return this.api.post<string[]>(ApiEndpoints.PRIVILEGE_ROLE_CODES, { roleId });
    }

    impact(privilegeCode:string):Observable<PrivilegeImpactDto> {
        return this.api.post<PrivilegeImpactDto>(ApiEndpoints.PRIVILEGE_IMPACT,{privilegeCode});
    }

    deactivate(privilegeCode:string,version:string):Observable<PrivilegeDeactivateResultDto> {
        return this.api.post<PrivilegeDeactivateResultDto>(ApiEndpoints.PRIVILEGE_DEACTIVATE,{privilegeCode,version,dependenciesPresented:true});
    }
}
