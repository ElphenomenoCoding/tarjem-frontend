import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideTranslocoConfig } from './core/i18n/transloco.config';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { AnalyticsService } from './core/services/analytics.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor])),
    provideTranslocoConfig(),
    {
      provide: APP_INITIALIZER,
      useFactory: (analytics: AnalyticsService) => () => analytics.init(),
      deps: [AnalyticsService],
      multi: true,
    },
  ],
};
