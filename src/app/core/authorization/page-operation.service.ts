import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthorizationDenialService } from '@nexacore/platform';

export interface PageFailure {
    message: string;
    code?: string;
    traceId?: string;
    denied: boolean;
}

/** Converts API failures into stable, supportable page state without replaying rejected requests. */
@Injectable({ providedIn: 'root' })
export class PageOperationService {
    constructor(private readonly denials: AuthorizationDenialService) {}

    failure(error: unknown, fallback: string): PageFailure {
        if (error instanceof HttpErrorResponse) {
            const denial = this.denials.classify(error);
            if (denial) return { message: denial.message, code: denial.code, traceId: denial.traceId, denied: true };
            const body = error.error as { message?: Array<{ code?: string; message?: string }> } | undefined;
            const detail = body?.message?.[0];
            return { message: detail?.message || error.message || fallback, code: detail?.code,
                traceId: error.headers?.get('X-Trace-Id') ?? undefined, denied: false };
        }
        return { message: error instanceof Error ? error.message : fallback, denied: false };
    }

    display(failure: PageFailure): string {
        return `${failure.code ? `[${failure.code}] ` : ''}${failure.message}${failure.traceId ? ` (trace: ${failure.traceId})` : ''}`;
    }
}
