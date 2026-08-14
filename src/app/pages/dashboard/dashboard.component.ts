import { Component,computed,inject,signal } from '@angular/core';
import { IconComponent } from '@nexacore/platform';
import {RouterLink} from '@angular/router';
import {DashboardService} from '../../core/services/dashboard.service';
import {DASHBOARD_PRESENTATION,DashboardAggregateDto,DashboardMetricKey} from './dashboard.model';
import {PageOperationService} from '../../core/authorization/page-operation.service';
import {DatePipe} from '@angular/common';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [IconComponent,RouterLink,DatePipe],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
    private readonly service=inject(DashboardService); private readonly operations=inject(PageOperationService);
    protected readonly loading=signal(true); protected readonly error=signal<string|null>(null); protected readonly aggregate=signal<DashboardAggregateDto|null>(null);
    protected readonly cards=computed(()=>Object.entries(this.aggregate()?.metrics??{}).map(([key,metric])=>({...DASHBOARD_PRESENTATION[key as DashboardMetricKey],key:key as DashboardMetricKey,...metric!})));
    constructor(){this.service.aggregate().subscribe({next:value=>{this.aggregate.set(value);this.loading.set(false);},error:error=>{this.loading.set(false);this.error.set(this.operations.display(this.operations.failure(error,'The authorized dashboard could not be loaded.')));}});}
}
