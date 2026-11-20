import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { ClientApplicationService } from './client-application.service';

describe('ClientApplicationService', () => {
    function create(post: ReturnType<typeof vi.fn>): ClientApplicationService {
        const injector = createEnvironmentInjector([{ provide: ApiService, useValue: { post } }], null as never);
        return runInInjectionContext(injector, () => new ClientApplicationService());
    }

    it('loads authoritative detail by id', () => {
        const post = vi.fn().mockReturnValue(of({}));
        create(post).detail(12, 7).subscribe();

        expect(post).toHaveBeenCalledWith(ApiEndpoints.CLIENT_APP_DETAIL, { clientApplicationId: 12, tenantId: 7 });
    });

    it('loads the focused API permission set by client application id', () => {
        const post = vi.fn().mockReturnValue(of([3, 7]));
        let result: Set<number> | undefined;

        create(post).apiPermissions(12).subscribe(value => result = value);

        expect(post).toHaveBeenCalledWith(ApiEndpoints.CLIENT_APP_API_PERMISSIONS, { clientApplicationId: 12 });
        expect(result).toEqual(new Set([3, 7]));
    });

    it('loads tenant-scoped feature permissions', () => {
        const post = vi.fn().mockReturnValue(of(['11020100481']));
        let result: Set<string> | undefined;

        create(post).featurePermissions(12, 7).subscribe(value => result = value);

        expect(post).toHaveBeenCalledWith(ApiEndpoints.CLIENT_APP_FEATURE_PERMISSIONS, { clientApplicationId: 12, tenantId: 7 });
        expect(result).toEqual(new Set(['11020100481']));
    });

    it('sends normalized tenant/business/branch tuples for full replacement', () => {
        const post = vi.fn().mockReturnValue(of(undefined));
        const scopes = [{ tenantId: 7, businessId: 8, branchId: 9 }];

        create(post).assignScopes(12, scopes, 'version-1').subscribe();

        expect(post).toHaveBeenCalledWith(ApiEndpoints.CLIENT_APP_ASSIGN_TENANTS, {
            clientApplicationId: 12,
            scopeAssignments: scopes,
            version: 'version-1'
        });
    });
});
