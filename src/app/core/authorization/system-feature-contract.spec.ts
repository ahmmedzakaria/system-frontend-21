import { describe, expect, it } from 'vitest';
import { ApiEndpoints } from '../api/api-endpoints';
import { SYSTEM_ACTION_PRIVILEGES, SYSTEM_FEATURE_CONTRACTS, SYSTEM_ROUTE_PRIVILEGES } from './system-feature-contract';

describe('SYSTEM_ADMIN_WEB feature contract', () => {
    it('inventories every app-owned endpoint exactly once', () => {
        const contracted = SYSTEM_FEATURE_CONTRACTS.flatMap(feature => feature.endpoints.map(item => item.endpoint));
        expect(new Set(contracted).size).toBe(contracted.length);
        expect([...contracted].sort()).toEqual(Object.keys(ApiEndpoints).sort());
    });

    it('uses valid backend privilege codes or the authenticated marker', () => {
        const privileges = [
            ...Object.values(SYSTEM_ROUTE_PRIVILEGES), ...Object.values(SYSTEM_ACTION_PRIVILEGES),
            ...SYSTEM_FEATURE_CONTRACTS.flatMap(feature => feature.endpoints.map(item => item.privilege))
        ];
        expect(privileges.every(code => code === 'AUTHENTICATED' || /^\d{11}$/.test(code))).toBe(true);
    });

    it('inventories unique route and action policies', () => {
        const routes = SYSTEM_FEATURE_CONTRACTS.flatMap(feature => Object.keys(feature.routes));
        const actions = SYSTEM_FEATURE_CONTRACTS.flatMap(feature => Object.keys(feature.actions));
        expect(new Set(routes).size).toBe(routes.length);
        expect(new Set(actions).size).toBe(actions.length);
    });
});
