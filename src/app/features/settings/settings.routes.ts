import { Route, Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';
import { CONTENT_PAGE, CONTENT_PAGES } from './content-pages';
import { ContentPageDefinition } from './models/content-page.model';

/** One route per content page; they share a component and differ only in `CONTENT_PAGE`. */
function contentPageRoute(page: ContentPageDefinition): Route {
  return {
    path: page.path,
    canDeactivate: [unsavedChangesGuard],
    providers: [{ provide: CONTENT_PAGE, useValue: page }],
    loadComponent: () =>
      import('./pages/content-page-settings/content-page-settings.component').then(
        (m) => m.ContentPageSettingsComponent,
      ),
  };
}

export const settingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/settings-shell/settings-shell.component').then(
        (m) => m.SettingsShellComponent,
      ),
    children: [
      { path: '', redirectTo: 'contacts', pathMatch: 'full' },
      {
        path: 'contacts',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/contact-settings/contact-settings.component').then(
            (m) => m.ContactSettingsComponent,
          ),
      },
      ...CONTENT_PAGES.map(contentPageRoute),
    ],
  },
];
