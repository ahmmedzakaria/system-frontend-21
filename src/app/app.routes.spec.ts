import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('system administration routes', () => {
    it('keeps only the non-authorized dashboard route explicitly public', () => {
        const shell = routes.find(route => route.path === '');
        const children = shell?.children ?? [];
        const publicPaths = children.filter(route => route.data?.['public']).map(route => route.path);

        expect(publicPaths).toEqual(['dashboard']);
        expect(children.filter(route => route.path && route.path !== 'dashboard').every(route => !route.data?.['public'])).toBe(true);
    });
});
