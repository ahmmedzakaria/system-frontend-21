import {inject,Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApiService} from '@nexacore/platform';
import {ApiEndpoints} from '../api/api-endpoints';
import {DashboardAggregateDto} from '../../pages/dashboard/dashboard.model';
@Injectable({providedIn:'root'}) export class DashboardService{private readonly api=inject(ApiService);aggregate():Observable<DashboardAggregateDto>{return this.api.post<DashboardAggregateDto>(ApiEndpoints.SYSTEM_DASHBOARD_AGGREGATE);}}
