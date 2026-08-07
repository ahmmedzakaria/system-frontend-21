import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {LayoutService} from '@nexacore/platform';
import {AuthService} from '@nexacore/platform';
import {BreadcrumbService} from '@nexacore/platform';
import {NotificationService} from '@nexacore/platform';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private breadcrumb: BreadcrumbService,
        private notification: NotificationService
    ) {
        // `layout` (where the header's Logout button lives) must not depend
        // on `auth` — registerLogoutHandler/requestLogout is the deliberate
        // bridge between them, so the actual sign-out flow (name lookup,
        // breadcrumb reset, toast, auth clear + redirect) has to live here.
        this.layoutService.registerLogoutHandler(() => {
            const username = this.authService.getCurrentUsername();
            this.breadcrumb.reset('Signed out');
            this.notification.notify({
                level: 'info',
                text: username ? `Signed out — see you soon, ${username}.` : 'Signed out.'
            });
            this.authService.logout();
        });

        // Keep the header's "Signed in as" panel in sync with the real logged-in
        // user — fires on initial load (token already present) and again on a
        // fresh login, since app.component only bootstraps once per session.
        this.authService.currentUser$.subscribe(decoded => {
            if (!decoded) {
                this.layoutService.setCurrentUser(null);
                return;
            }
            const [role] = this.authService.getCurrentUserRoles();
            this.layoutService.setCurrentUser({
                username: decoded.sub,
                role: role ? this.formatRole(role) : undefined
            });
        });

        const token = this.authService.getToken();
        if (token) {
            this.layoutService.setAuthenticatedLayout();
        } else {
            this.layoutService.setPublicLayout();
        }
    }

    private formatRole(role: string): string {
        return role
            .replace(/^ROLE_/, '')
            .toLowerCase()
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
