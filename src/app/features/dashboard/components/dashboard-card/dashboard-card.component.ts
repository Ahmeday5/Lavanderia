import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Shared chrome for every dashboard panel: title, subtitle, icon, entrance
 * animation. Content is projected.
 *
 *   <app-dashboard-card heading="توزيع الطلبات" subheading="…" icon="fa-chart-pie" [delay]="120">
 *     …
 *   </app-dashboard-card>
 */
@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dc" [style.animation-delay.ms]="delay()">
      <header class="dc__head">
        <div>
          <h2 class="dc__title">{{ heading() }}</h2>
          @if (subheading()) {
            <p class="dc__sub">{{ subheading() }}</p>
          }
        </div>
        @if (icon()) {
          <span class="dc__icon" aria-hidden="true"><i class="fa-solid" [class]="icon()"></i></span>
        }
      </header>
      <ng-content />
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-width: 0;
      }
      .dc {
        display: flex;
        flex-direction: column;
        gap: 16px;
        height: 100%;
        padding: 20px;
        border-radius: 18px;
        background: var(--bg2);
        border: 1px solid var(--brd);
        animation: dc-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .dc__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .dc__title {
        margin: 0;
        font-size: 14px;
        font-weight: 800;
        color: var(--txt);
      }
      .dc__sub {
        margin: 3px 0 0;
        font-size: 10.5px;
        color: var(--txt3);
      }
      .dc__icon {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: var(--bg3);
        color: var(--txt2);
        font-size: 13px;
      }
      @keyframes dc-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
      }
      @media (max-width: 576px) {
        .dc {
          padding: 16px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .dc {
          animation: none;
        }
      }
    `,
  ],
})
export class DashboardCardComponent {
  readonly heading = input.required<string>();
  readonly subheading = input<string>('');
  readonly icon = input<string>('');
  /** Entrance stagger, in ms. */
  readonly delay = input<number>(0);
}
