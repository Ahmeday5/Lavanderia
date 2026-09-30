import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountUpDirective } from '../../../../shared/directives/count-up.directive';

export type KpiTone = 'blue' | 'teal' | 'purple' | 'amber' | 'pink';

export interface Kpi {
  key: string;
  label: string;
  icon: string;
  tone: KpiTone;
  value: number;
  format: (value: number) => string;
  /** Secondary line under the value. */
  note: string;
  /** Highlights the note (something needs attention). */
  noteAlert: boolean;
  /** Makes the whole tile a link when set. */
  route: string | null;
}

/** Headline number tile with an animated count-up. */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CountUpDirective],
  template: `
    <a
      class="kpi"
      [class]="'kpi--' + kpi().tone"
      [class.kpi--link]="kpi().route"
      [routerLink]="kpi().route"
      [style.animation-delay.ms]="delay()"
    >
      <div class="kpi__top">
        <span class="kpi__icon" aria-hidden="true"><i class="fa-solid" [class]="kpi().icon"></i></span>
        @if (kpi().route) {
          <i class="fa-solid fa-arrow-left kpi__arrow" aria-hidden="true"></i>
        }
      </div>
      <div class="kpi__value" [appCountUp]="kpi().value" [countUpFormat]="kpi().format"></div>
      <div class="kpi__label">{{ kpi().label }}</div>
      <div class="kpi__note" [class.kpi__note--alert]="kpi().noteAlert">
        @if (kpi().noteAlert) {
          <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
        }
        {{ kpi().note }}
      </div>
    </a>
  `,
  styleUrl: './kpi-card.component.scss',
})
export class KpiCardComponent {
  readonly kpi = input.required<Kpi>();
  /** Entrance stagger, in ms. */
  readonly delay = input<number>(0);
}
