import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@nexacore/platform';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../api/api-endpoints';
import { TenantDetailDto, TenantDomainDto, TenantDomainMutationRequest, TenantDto, TenantRegistrationRequest } from '../../pages/tenant/tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantAdministrationService {
    private readonly api = inject(ApiService);

    list(): Observable<TenantDto[]> {
        return this.api.post<TenantDto[]>(ApiEndpoints.TENANT_LIST);
    }

    register(request: TenantRegistrationRequest): Observable<TenantDto> {
        return this.api.post<TenantDto>(ApiEndpoints.TENANT_REGISTER, request);
    }

    detail(tenantId: number): Observable<TenantDetailDto> {
        return this.api.post<TenantDetailDto>(ApiEndpoints.TENANT_DETAIL, { tenantId });
    }

    addDomain(request: TenantDomainMutationRequest): Observable<TenantDomainDto> {
        return this.stepUp(ApiEndpoints.TENANT_DOMAIN_ADD, request);
    }

    setPrimaryDomain(tenantId: number, domainId: number): Observable<TenantDomainDto> {
        return this.stepUp(ApiEndpoints.TENANT_DOMAIN_SET_PRIMARY, { tenantId, domainId });
    }

    deactivateDomain(tenantId: number, domainId: number): Observable<TenantDomainDto> {
        return this.stepUp(ApiEndpoints.TENANT_DOMAIN_DEACTIVATE, { tenantId, domainId });
    }

    verifyDomain(domainId: number): Observable<TenantDto> {
        return this.stepUp(ApiEndpoints.TENANT_DOMAIN_VERIFY, { domainId });
    }

    transition(action: 'activate' | 'suspend' | 'reactivate' | 'cancel', tenantId: number, version: number, reason: string | null): Observable<TenantDto> {
        const endpoint = {
            activate: ApiEndpoints.TENANT_ACTIVATE,
            suspend: ApiEndpoints.TENANT_SUSPEND,
            reactivate: ApiEndpoints.TENANT_REACTIVATE,
            cancel: ApiEndpoints.TENANT_CANCEL
        }[action];
        return this.stepUp(endpoint, { tenantId, version, reason });
    }

    private stepUp<T>(endpoint: import('@nexacore/platform').ApiEndpoint, body: object): Observable<T> {
        const headers = new HttpHeaders().set('X-Step-Up-Authentication', 'reauthenticated');
        return this.api.post<T>(endpoint, body, { headers });
    }
}
