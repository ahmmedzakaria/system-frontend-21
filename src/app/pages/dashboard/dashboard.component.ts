import { Component } from '@angular/core';
import { IconComponent } from '@nexacore/platform';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [IconComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
    protected readonly stats = [
        { title: 'Client Applications', value: '—', icon: 'building' },
        { title: 'Privileges', value: '—', icon: 'lock' },
        { title: 'Layout Profiles', value: '—', icon: 'grid' },
        { title: 'Active Licenses', value: '—', icon: 'check' },
        { title: 'Database Backups', value: '—', icon: 'archive' }
    ];
}
