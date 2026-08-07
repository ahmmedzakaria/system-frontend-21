import { Routes } from '@angular/router';
import { AUTH_ROUTES, authGuard, routePrivilegeGuard } from '@nexacore/platform';

export const routes: Routes = [
    ...AUTH_ROUTES,
    {
        path: '',
        loadComponent: () =>
            import('@nexacore/platform').then(m => m.LayoutComponent),
        canActivate: [authGuard],
        canActivateChild: [routePrivilegeGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
                // Not privilege-gated by the backend nav tree or a dedicated
                // code — explicitly public rather than open by omission.
                data: { public: true },
            },
            // Access Control, Privilege, Layout, and License feature routes
            // are added module-by-module in later phases (see
            // /home/zahmmed/.claude/plans/dreamy-swimming-bubble.md).
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ],
    },
    { path: '**', redirectTo: 'dashboard' },
];
