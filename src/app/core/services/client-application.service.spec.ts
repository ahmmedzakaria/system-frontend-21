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
        create(post).detail(12).subscribe();

        expect(post).toHaveBeenCalledWith(ApiEndpoints.CLIENT_APP_DETAIL, { clientApplicationId: 12 });
    });

    it('sends normalized tenant/business/branch tuples for full replacement', () => {
        const post = vi.fn().mockReturnValue(of(undefined));
        const scopes = [{ tenantId: 7, businessId: 8, branchId: 9 }];

        create(post).assignScopes(12, scopes).subscribe();

        expect(post).toHaveBeenCalledWith(ApiEndpoints.CLIENT_APP_ASSIGN_TENANTS, {
            clientApplicationId: 12,
            scopeAssignments: scopes
        });
    });
});
