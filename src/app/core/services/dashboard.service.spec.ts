import {createEnvironmentInjector,runInInjectionContext} from '@angular/core';
import {of} from 'rxjs';
import {describe,expect,it,vi} from 'vitest';
import {ApiService} from '@nexacore/platform';
import {ApiEndpoints} from '../api/api-endpoints';
import {DashboardService} from './dashboard.service';
describe('DashboardService',()=>{
 it('loads the dashboard through exactly one aggregate request',()=>{const post=vi.fn().mockReturnValue(of({metrics:{}}));const injector=createEnvironmentInjector([{provide:ApiService,useValue:{post}}],null as never);const service=runInInjectionContext(injector,()=>new DashboardService());service.aggregate().subscribe();expect(post).toHaveBeenCalledTimes(1);expect(post).toHaveBeenCalledWith(ApiEndpoints.SYSTEM_DASHBOARD_AGGREGATE);});
});
