import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  input,
  signal,
} from '@angular/core';
import { formatPercent } from '../../../utils/number-format.util';

/**
 * Single-value ring gauge (a rate / completion share).
 *
 *   <app-progress-ring [value]="0.42" color="#1baf7a" label="نسبة الإنجاز" />
 *
 * `value` is a 0‥1 ratio. The percentage is printed in the middle — the ring
 * is decoration around a number, never the only way to read it.
 */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pr"
      [style.width.px]="size()"
      [style.height.px]="size()"
      role="img"
      [attr.aria-label]="label() + ' ' + percent()"
    >
      <svg [attr.viewBox]="'0 0 ' + size() + ' ' + size()" aria-hidden="true">
        <circle
          class="pr__track"
          [attr.cx]="size() / 2"
          [attr.cy]="size() / 2"
          [attr.r]="radius()"
          [attr.stroke-width]="thickness()"
        />
        <circle
          class="pr__bar"
          [attr.cx]="size() / 2"
          [attr.cy]="size() / 2"
          [attr.r]="radius()"
          [attr.stroke]="color()"
          [attr.stroke-width]="thickness()"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="drawn() ? circumference() * (1 - clamped()) : circumference()"
          [attr.transform]="'rotate(-90 ' + size() / 2 + ' ' + size() / 2 + ')'"
        />
      </svg>
      <span class="pr__value">{{ percent() }}</span>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .pr {
        position: relative;
        display: grid;
        place-items: center;
      }
      svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .pr__track {
        fill: none;
        stroke: var(--brd);
      }
      .pr__bar {
        fill: none;
        stroke-linecap: round;
        transition: stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .pr__value {
        position: relative;
        font-size: 15px;
        font-weight: 800;
        color: var(--txt);
      }
      @media (prefers-reduced-motion: reduce) {
        .pr__bar {
          transition: none;
        }
      }
    `,
  ],
})
export class ProgressRingComponent {
  readonly value = input.required<number>();
  readonly label = input<string>('');
  readonly color = input<string>('var(--bl)');
  readonly size = input<number>(76);
  readonly thickness = input<number>(8);

  protected readonly drawn = signal(false);
  protected readonly radius = computed(() => (this.size() - this.thickness()) / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly clamped = computed(() => {
    const v = this.value();
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
  });
  protected readonly percent = computed(() => formatPercent(this.clamped()));

  constructor() {
    afterNextRender(() => requestAnimationFrame(() => this.drawn.set(true)));
  }
}
