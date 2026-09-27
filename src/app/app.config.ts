import {
  ApplicationConfig,
  ErrorHandler,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withViewTransitions,
  withComponentInputBinding,
  withRouterConfig,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withFetch,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { authInterceptor } from './core/auth/interceptors/auth.interceptor';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';
import { timeoutInterceptor } from './core/interceptors/timeout.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(
      routes,
      withViewTransitions({
        // A transition is aborted (e.g. the DOM update timed out or was
        // superseded by another navigation) by rejecting these promises.
        // That's expected and harmless — without a handler it surfaces as
        // an "Uncaught (in promise)" error.
        onViewTransitionCreated: ({ transition }) => {
          transition.ready.catch(() => undefined);
          transition.finished.catch(() => undefined);
        },
      }),
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withPreloading(PreloadAllModules)
    ),
    // Interceptor order matters (outermost → innermost → HTTP backend):
    //   cache   → short-circuits hits before any other work runs
    //   timeout → bounds how long a request may hang with no response at all
    //             (must wrap loader/error so a stall still hides the loader
    //             and reaches the error layer instead of spinning forever)
    //   loader  → toggles the global spinner
    //   error   → normalizes failures into ApiError + toasts
    //   auth    → attaches Bearer + handles 401 refresh dance (must be
    //             innermost so it intercepts 401s BEFORE error can toast them;
    //             successful retries never reach the error layer at all)
    provideHttpClient(
      withFetch(),
      withInterceptors([
        cacheInterceptor,
        timeoutInterceptor,
        loaderInterceptor,
        errorInterceptor,
        authInterceptor,
      ]),
    ),
    provideAnimationsAsync(),
  ],
};
