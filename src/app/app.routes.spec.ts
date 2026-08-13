import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { SYSTEM_ROUTE_PRIVILEGES } from './core/authorization/system-feature-contract';

describe('system administration routes', () => {
    it('keeps only the non-authorized dashboard route explicitly public', () => {
        const shell = routes.find(route => route.path === '');
        const children = shell?.children ?? [];
        const publicPaths = children.filter(route => route.data?.['public']).map(route => route.path);

        expect(publicPaths).toEqual(['dashboard']);
        expect(children.filter(route => route.path && route.path !== 'dashboard').every(route => !route.data?.['public'])).toBe(true);
    });

    it('keeps every protected application route in the feature contract', () => {
        const shell = routes.find(route => route.path === '');
        const protectedPaths = (shell?.children ?? [])
            .filter(route => route.path && route.path !== 'dashboard')
            .map(route => `/${route.path}`)
            .sort();

        expect(protectedPaths).toEqual(Object.keys(SYSTEM_ROUTE_PRIVILEGES).sort());
    });
});
