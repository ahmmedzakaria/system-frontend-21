import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@nexacore/platform';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../api/api-endpoints';
import { TenantDto, TenantRegistrationRequest } from '../../pages/tenant/tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantAdministrationService {
    private readonly api = inject(ApiService);

    list(): Observable<TenantDto[]> {
        return this.api.post<TenantDto[]>(ApiEndpoints.TENANT_LIST);
    }

    register(request: TenantRegistrationRequest): Observable<TenantDto> {
        return this.api.post<TenantDto>(ApiEndpoints.TENANT_REGISTER, request);
    }

    verifyDomain(domainId: number): Observable<TenantDto> {
        return this.stepUp(ApiEndpoints.TENANT_DOMAIN_VERIFY, { domainId });
    }

    transition(action: 'activate' | 'suspend' | 'reactivate' | 'cancel', tenantId: number, reason: string | null): Observable<TenantDto> {
        const endpoint = {
            activate: ApiEndpoints.TENANT_ACTIVATE,
            suspend: ApiEndpoints.TENANT_SUSPEND,
            reactivate: ApiEndpoints.TENANT_REACTIVATE,
            cancel: ApiEndpoints.TENANT_CANCEL
        }[action];
        return this.stepUp(endpoint, { tenantId, reason });
    }

    private stepUp<T>(endpoint: typeof ApiEndpoints.TENANT_ACTIVATE, body: object): Observable<T> {
        const headers = new HttpHeaders().set('X-Step-Up-Authentication', 'reauthenticated');
        return this.api.post<T>(endpoint, body, { headers });
    }
}
