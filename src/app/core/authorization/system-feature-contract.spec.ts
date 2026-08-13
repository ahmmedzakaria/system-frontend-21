import { describe, expect, it } from 'vitest';
import { ApiEndpoints } from '../api/api-endpoints';
import {
    AUTHENTICATED_POLICY,
    SYSTEM_ACTION_POLICIES,
    SYSTEM_FEATURE_CONTRACTS,
    SYSTEM_ROUTE_POLICIES
} from './system-feature-contract';

describe('SYSTEM_ADMIN_WEB feature contract', () => {
    it('inventories every app-owned endpoint exactly once', () => {
        const contracted = SYSTEM_FEATURE_CONTRACTS.flatMap(feature => feature.endpoints.map(item => item.endpoint));
        expect(new Set(contracted).size).toBe(contracted.length);
        expect([...contracted].sort()).toEqual(Object.keys(ApiEndpoints).sort());
    });

    it('contains semantic policy keys and no backend-owned numeric privilege codes', () => {
        const policies = [
            ...Object.values(SYSTEM_ROUTE_POLICIES), ...Object.values(SYSTEM_ACTION_POLICIES),
            ...SYSTEM_FEATURE_CONTRACTS.flatMap(feature => feature.endpoints.map(item => item.policy))
        ];
        expect(policies.some(policy => /^\d+$/.test(policy))).toBe(false);
        expect(policies.every(policy => policy === AUTHENTICATED_POLICY || /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(policy))).toBe(true);
    });

    it('uses declared UI action codes as their stable policy keys', () => {
        expect(Object.entries(SYSTEM_ACTION_POLICIES).every(([action, policy]) => action === policy)).toBe(true);
    });

    it('inventories unique route and action policies', () => {
        const routes = SYSTEM_FEATURE_CONTRACTS.flatMap(feature => Object.keys(feature.routes));
        const actions = SYSTEM_FEATURE_CONTRACTS.flatMap(feature => Object.keys(feature.actions));
        expect(new Set(routes).size).toBe(routes.length);
        expect(new Set(actions).size).toBe(actions.length);
    });
});
