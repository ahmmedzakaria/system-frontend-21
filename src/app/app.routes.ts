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
            {
                path: 'access-control/client-applications',
                loadComponent: () =>
                    import('./pages/access-control/client-applications/client-applications-list.component').then(m => m.ClientApplicationsListComponent),
            },
            {
                path: 'access-control/client-applications/create',
                loadComponent: () =>
                    import('./pages/access-control/client-applications/client-application-editor.component').then(m => m.ClientApplicationEditorComponent),
            },
            {
                path: 'access-control/client-applications/:id/edit',
                loadComponent: () =>
                    import('./pages/access-control/client-applications/client-application-editor.component').then(m => m.ClientApplicationEditorComponent),
            },
            {
                path: 'access-control/client-applications/:id',
                loadComponent: () =>
                    import('./pages/access-control/client-applications/client-application-detail.component').then(m => m.ClientApplicationDetailComponent),
            },
            {
                path: 'access-control/api-registry',
                loadComponent: () =>
                    import('./pages/access-control/api-registry/api-registry-list.component').then(m => m.ApiRegistryListComponent),
            },
            {
                path: 'access-control/privileges',
                loadComponent: () =>
                    import('./pages/access-control/privileges/privileges-list.component').then(m => m.PrivilegesListComponent),
            },
            {
                path: 'access-control/tenants',
                loadComponent: () =>
                    import('./pages/tenant/tenant-administration.component').then(m => m.TenantAdministrationComponent),
            },
            {
                path: 'access-control/users',
                loadComponent: () =>
                    import('./pages/access-control/users/user-list.component').then(m => m.UserListComponent),
            },
            {
                path: 'access-control/roles',
                loadComponent: () => import('./pages/access-control/roles/role-administration.component').then(m => m.RoleAdministrationComponent),
            },
            {
                path: 'access-control/roles/:id/privileges',
                loadComponent: () => import('./pages/access-control/roles/role-administration.component').then(m => m.RoleAdministrationComponent),
            },
            {
                path: 'layout/profiles',
                loadComponent: () =>
                    import('./pages/layout/profiles-policies/profiles-policies-list.component').then(m => m.ProfilesPoliciesListComponent),
            },
            {
                path: 'layout/navigation-tree',
                loadComponent: () =>
                    import('./pages/layout/navigation-tree/navigation-tree.component').then(m => m.NavigationTreeComponent),
            },
            {
                path: 'license',
                loadComponent: () =>
                    import('./pages/license/license-list.component').then(m => m.LicenseListComponent),
            },
            {
                path: 'backup',
                loadComponent: () =>
                    import('./pages/backup/backup-list.component').then(m => m.BackupListComponent),
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ],
    },
    { path: '**', redirectTo: 'dashboard' },
];
