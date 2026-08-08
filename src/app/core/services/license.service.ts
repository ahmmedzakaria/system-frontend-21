import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import {
    GeneratedLicenseKeyDto,
    LicenseEntitlementDto,
    LicenseEntitlementRequestDto,
    LicenseKeyRequestDto,
    LicenseKeySummaryDto,
    LicensePlanDto,
    LicensePlanRequestDto,
    LicenseSubscriptionDto,
    LicenseSubscriptionRequestDto
} from '../../pages/license/license.model';

@Injectable({ providedIn: 'root' })
export class LicenseService {
    private readonly api = inject(ApiService);

    planList(): Observable<LicensePlanDto[]> {
        return this.api.post<LicensePlanDto[]>(ApiEndpoints.LICENSE_PLAN_LIST);
    }

    planSave(request: LicensePlanRequestDto): Observable<LicensePlanDto> {
        return this.api.post<LicensePlanDto>(ApiEndpoints.LICENSE_PLAN_SAVE, request);
    }

    planEntitlementList(planCode: string): Observable<LicenseEntitlementDto[]> {
        return this.api.post<LicenseEntitlementDto[]>(ApiEndpoints.LICENSE_PLAN_ENTITLEMENT_LIST, { planCode });
    }

    planEntitlementSave(request: LicenseEntitlementRequestDto): Observable<void> {
        return this.api.post<void>(ApiEndpoints.LICENSE_PLAN_ENTITLEMENT_SAVE, request);
    }

    subscriptionList(): Observable<LicenseSubscriptionDto[]> {
        return this.api.post<LicenseSubscriptionDto[]>(ApiEndpoints.LICENSE_SUBSCRIPTION_LIST);
    }

    subscriptionAssign(request: LicenseSubscriptionRequestDto): Observable<LicenseSubscriptionDto> {
        return this.api.post<LicenseSubscriptionDto>(ApiEndpoints.LICENSE_SUBSCRIPTION_ASSIGN, request);
    }

    subscriptionSuspend(subscriptionCode: string, reason: string): Observable<LicenseSubscriptionDto> {
        return this.api.post<LicenseSubscriptionDto>(ApiEndpoints.LICENSE_SUBSCRIPTION_SUSPEND, { subscriptionCode, reason });
    }

    subscriptionReactivate(subscriptionCode: string): Observable<LicenseSubscriptionDto> {
        return this.api.post<LicenseSubscriptionDto>(ApiEndpoints.LICENSE_SUBSCRIPTION_REACTIVATE, { subscriptionCode });
    }

    subscriptionCancel(subscriptionCode: string): Observable<LicenseSubscriptionDto> {
        return this.api.post<LicenseSubscriptionDto>(ApiEndpoints.LICENSE_SUBSCRIPTION_CANCEL, { subscriptionCode });
    }

    subscriptionEntitlementList(subscriptionCode: string): Observable<LicenseEntitlementDto[]> {
        return this.api.post<LicenseEntitlementDto[]>(ApiEndpoints.LICENSE_SUBSCRIPTION_ENTITLEMENT_LIST, { subscriptionCode });
    }

    subscriptionEntitlementSave(request: LicenseEntitlementRequestDto): Observable<void> {
        return this.api.post<void>(ApiEndpoints.LICENSE_SUBSCRIPTION_ENTITLEMENT_SAVE, request);
    }

    keyList(subscriptionCode: string): Observable<LicenseKeySummaryDto[]> {
        return this.api.post<LicenseKeySummaryDto[]>(ApiEndpoints.LICENSE_KEY_LIST, { subscriptionCode });
    }

    keyGenerate(request: LicenseKeyRequestDto): Observable<GeneratedLicenseKeyDto> {
        return this.api.post<GeneratedLicenseKeyDto>(ApiEndpoints.LICENSE_KEY_GENERATE, request);
    }
}
