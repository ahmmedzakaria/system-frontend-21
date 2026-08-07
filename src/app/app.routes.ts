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
            // Access Control (Phase 1). Marked `public: true` because the
            // backend doesn't yet have routePolicies/uiPolicies seeded for
            // these routes/action codes (routePrivilegeGuard would fail-closed
            // and block everyone otherwise) — real authorization is still
            // enforced server-side by each endpoint's @PrivilegeApi code
            // (CLIENT_APPLICATION_VIEW/MANAGE, API_REGISTRY_VIEW/MANAGE/SYNCHRONIZE).
            {
                path: 'access-control/client-applications',
                loadComponent: () =>
                    import('./pages/access-control/client-applications/client-applications-list.component').then(m => m.ClientApplicationsListComponent),
                data: { public: true },
            },
            {
                path: 'access-control/client-applications/create',
                loadComponent: () =>
                    import('./pages/access-control/client-applications/client-application-editor.component').then(m => m.ClientApplicationEditorComponent),
                data: { public: true },
            },
            {
                path: 'access-control/client-applications/:id/edit',
                loadComponent: () =>
                    import('./pages/access-control/client-applications/client-application-editor.component').then(m => m.ClientApplicationEditorComponent),
                data: { public: true },
            },
            {
                path: 'access-control/client-applications/:id',
                loadComponent: () =>
                    import('./pages/access-control/client-applications/client-application-detail.component').then(m => m.ClientApplicationDetailComponent),
                data: { public: true },
            },
            {
                path: 'access-control/api-registry',
                loadComponent: () =>
                    import('./pages/access-control/api-registry/api-registry-list.component').then(m => m.ApiRegistryListComponent),
                data: { public: true },
            },
            // Privilege, Layout, and License feature routes are added
            // module-by-module in later phases (see
            // /home/zahmmed/.claude/plans/dreamy-swimming-bubble.md).
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ],
    },
    { path: '**', redirectTo: 'dashboard' },
];
