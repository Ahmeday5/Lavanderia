import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

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
      {
        path: 'privacy-policy',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/privacy-policy-settings/privacy-policy-settings.component').then(
            (m) => m.PrivacyPolicySettingsComponent,
          ),
      },
    ],
  },
];
