import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Minimal inline-SVG icon set for starter navigation/UI use. Swap this for
 * your icon library of choice (e.g. an icon font, or a per-icon SVG sprite) —
 * the important pattern to keep is a single component keyed by name so
 * templates never inline raw `<svg>` markup.
 */
export type IconName =
  | 'home'
  | 'users'
  | 'settings'
  | 'file'
  | 'chart'
  | 'grid'
  | 'bell'
  | 'menu'
  | 'map-pin'
  | 'washing-machine'
  | 'user-shield'
  | 'store'
  | 'user-heart';

const PATHS: Record<IconName, string> = {
  home: 'M3 9.5L10 4l7 5.5V16a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3H8v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z',
  users:
    'M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 16c.3-2.5 2-4 4.5-4S11 13.5 11 16M9.5 12.2c.4-1.6 1.9-2.7 4-2.7 2.5 0 4.2 1.5 4.5 4',
  settings:
    'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm7-2.5-1.6-.3a5.4 5.4 0 0 0-.5-1.2l1-1.4-1.4-1.4-1.4 1a5.4 5.4 0 0 0-1.2-.5L11.6 3H8.4l-.3 1.7c-.4.1-.8.3-1.2.5l-1.4-1L4.1 5.6l1 1.4c-.2.4-.4.8-.5 1.2L3 10.5v0l1.6.3c.1.4.3.8.5 1.2l-1 1.4 1.4 1.4 1.4-1c.4.2.8.4 1.2.5l.3 1.7h3.2l.3-1.7c.4-.1.8-.3 1.2-.5l1.4 1 1.4-1.4-1-1.4c.2-.4.4-.8.5-1.2L17 10Z',
  file: 'M6 2.5h5.5L15 6v10.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Zm5 0V6h3.5',
  chart: 'M4 16V9M9 16V4M14 16v-6M3 17h13',
  grid: 'M3 3h5.5v5.5H3V3Zm8.5 0H17v5.5h-5.5V3ZM3 11.5h5.5V17H3v-5.5Zm8.5 0H17V17h-5.5v-5.5Z',
  bell: 'M10 3a4 4 0 0 0-4 4v2.4c0 .5-.2 1-.5 1.4L4 13h12l-1.5-2.2a2.3 2.3 0 0 1-.5-1.4V7a4 4 0 0 0-4-4Zm-1.7 12a1.8 1.8 0 0 0 3.4 0',
  menu: 'M3 5h14M3 10h14M3 15h14',
  'map-pin':
    'M10 2.5c-3 0-5.5 2.4-5.5 5.5 0 3.9 5.5 9.5 5.5 9.5s5.5-5.6 5.5-9.5c0-3.1-2.5-5.5-5.5-5.5Zm0 7.7a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Z',
  'washing-machine':
    'M4.5 2.5h11a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Zm1.2 2h.6M8.6 4.5h.6M10 13.2a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Zm0-1.6a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Z',
  'user-shield':
    'M10 2.5 16 4.5v4.3c0 3.7-2.4 6.9-6 8.2-3.6-1.3-6-4.5-6-8.2V4.5L10 2.5Zm0 2.6L6 6.4v2.4c0 2.6 1.6 4.9 4 5.9V5.1Zm-2.2 4.3a2.2 2.2 0 1 1 4.4 0 2.2 2.2 0 0 1-4.4 0Zm-1 5c.5-1.3 1.7-2.1 3.2-2.1s2.7.8 3.2 2.1c-.9.9-2 1.5-3.2 1.9-1.2-.4-2.3-1-3.2-1.9Z',
  store:
    'M3 7.5 4 3h12l1 4.5M3 7.5v8.5a1 1 0 0 0 1 1h1.5v-5h3v5H14v-5h3v5h1.5a1 1 0 0 0 1-1V7.5M3 7.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0',
  'user-heart':
    'M8 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7c.4-3.3 2.7-5.3 6-5.3.7 0 1.4.1 2 .3M14.3 11.2c1-.9 2.4-.6 2.9.4.5 1.2-.2 2.3-2.9 4.4-2.7-2.1-3.4-3.2-2.9-4.4.5-1 1.9-1.3 2.9-.4Z',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        [attr.d]="path()"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: [':host { display: inline-flex; line-height: 0; }'],
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);

  protected path(): string {
    return PATHS[this.name()] ?? PATHS['grid'];
  }
}
