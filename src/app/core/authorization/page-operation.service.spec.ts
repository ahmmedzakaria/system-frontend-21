import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { AuthorizationDenialService } from '@nexacore/platform';
import { describe, expect, it } from 'vitest';
import { PageOperationService } from './page-operation.service';

describe('PageOperationService', () => {
    function create(denial: ReturnType<AuthorizationDenialService['classify']> = null): PageOperationService {
        return new PageOperationService({ classify: () => denial } as unknown as AuthorizationDenialService);
    }

    it.each(['CLIENT_API_NOT_ALLOWED','CLIENT_FEATURE_NOT_ALLOWED','USER_PRIVILEGE_NOT_ALLOWED','DATA_SCOPE_NOT_ALLOWED'])(
        'preserves stable denial %s and trace without replaying the operation', code => {
            const service=create({ code:code as never,status:403,message:'Denied',traceId:'trace-7',recoverability:'refresh-context' });
            const failure=service.failure(new HttpErrorResponse({status:403}),'fallback');
            expect(failure).toMatchObject({code,message:'Denied',traceId:'trace-7',denied:true});
        });

    it('preserves a non-denial API code and response trace', () => {
        const service=create();
        const error=new HttpErrorResponse({status:409,headers:new HttpHeaders({'X-Trace-Id':'trace-9'}),
            error:{message:[{code:'STALE_ASSIGNMENT_VERSION',message:'Reload required'}]}});
        expect(service.failure(error,'fallback')).toEqual({message:'Reload required',code:'STALE_ASSIGNMENT_VERSION',traceId:'trace-9',denied:false});
    });
});
