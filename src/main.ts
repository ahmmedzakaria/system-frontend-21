import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { API_ENVIRONMENT, jwtInterceptor, languageInterceptor } from '@nexacore/platform';
import {apiResponseInterceptor} from "@nexacore/platform";
import { TranslocoHttpLoader } from '@nexacore/platform';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        { provide: API_ENVIRONMENT, useValue: environment },
        provideHttpClient(
            withInterceptors([languageInterceptor, jwtInterceptor, apiResponseInterceptor])
        ),
        provideTransloco({
            config: {
                availableLangs: ['en', 'bn', 'ar'],
                defaultLang: 'en',
                fallbackLang: 'en',
                reRenderOnLangChange: true,
                prodMode: !isDevMode()
            },
            loader: TranslocoHttpLoader
        })
    ]
}).catch(err => console.error(err));
