import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
    {
      route: 'privacy-policy',
      label: 'سياسة الخصوصية',
      hint: 'المحتوى المعروض في التطبيق',
      icon: 'fa-shield-halved',
    },
  ];
}
