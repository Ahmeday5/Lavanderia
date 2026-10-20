import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CONTENT_PAGES } from '../../content-pages';

interface SettingsTab {
  route: string;
  label: string;
  hint: string;
  icon: string;
}

/** Settings area chrome: hero + section tabs; each section is a child route. */
@Component({
  selector: 'app-settings-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './settings-shell.component.html',
  styleUrl: './settings-shell.component.scss',
})
export class SettingsShellComponent {
  protected readonly tabs: readonly SettingsTab[] = [
    {
      route: 'contacts',
      label: 'بيانات التواصل',
      hint: 'أرقام الهاتف والبريد',
      icon: 'fa-headset',
    },
    ...CONTENT_PAGES.map(({ path, title, hint, icon }) => ({ route: path, label: title, hint, icon })),
  ];
}
