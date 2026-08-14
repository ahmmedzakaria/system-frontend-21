import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { AuthPolicyAdministrationDto, AuthPolicyAdministrationRequest } from '../../pages/access-control/access-control.model';

@Injectable({ providedIn: 'root' })
export class AuthPolicyAdministrationService {
    private readonly api = inject(ApiService);

    list(tenantId: number): Observable<AuthPolicyAdministrationDto[]> {
        return this.api.post<AuthPolicyAdministrationDto[]>(ApiEndpoints.AUTH_POLICY_LIST, { tenantId });
    }

    save(request: AuthPolicyAdministrationRequest): Observable<AuthPolicyAdministrationDto> {
        return this.api.post<AuthPolicyAdministrationDto>(ApiEndpoints.AUTH_POLICY_SAVE, request);
    }
}
