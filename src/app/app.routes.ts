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
            {
                path: 'access-control/privileges',
                loadComponent: () =>
                    import('./pages/access-control/privileges/privileges-list.component').then(m => m.PrivilegesListComponent),
                data: { public: true },
            },
            {
                path: 'access-control/users',
                loadComponent: () =>
                    import('./pages/access-control/users/user-list.component').then(m => m.UserListComponent),
                data: { public: true },
            },
            {
                path: 'layout/profiles',
                loadComponent: () =>
                    import('./pages/layout/profiles-policies/profiles-policies-list.component').then(m => m.ProfilesPoliciesListComponent),
                data: { public: true },
            },
            {
                path: 'layout/navigation-tree',
                loadComponent: () =>
                    import('./pages/layout/navigation-tree/navigation-tree.component').then(m => m.NavigationTreeComponent),
                data: { public: true },
            },
            {
                path: 'license',
                loadComponent: () =>
                    import('./pages/license/license-list.component').then(m => m.LicenseListComponent),
                data: { public: true },
            },
            {
                path: 'backup',
                loadComponent: () =>
                    import('./pages/backup/backup-list.component').then(m => m.BackupListComponent),
                data: { public: true },
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ],
    },
    { path: '**', redirectTo: 'dashboard' },
];
