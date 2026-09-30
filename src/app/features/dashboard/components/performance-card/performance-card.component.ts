import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProgressRingComponent } from '../../../../shared/components/charts/progress-ring/progress-ring.component';
import { CountUpDirective } from '../../../../shared/directives/count-up.directive';
import { formatInteger } from '../../../../shared/utils/number-format.util';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';

/** Completion / rejection rates plus the live count of open orders. */
@Component({
  selector: 'app-performance-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardCardComponent, ProgressRingComponent, CountUpDirective],
  template: `
    <app-dashboard-card
      heading="مؤشرات الأداء"
      [subheading]="'من إجمالي ' + int(totalOrders()) + ' طلب'"
      icon="fa-gauge-high"
      [delay]="delay()"
    >
      <div class="pc">
        <div class="pc__rate">
          <app-progress-ring [value]="completionRate()" color="#1baf7a" label="نسبة الإنجاز" />
          <span class="pc__label">نسبة الإنجاز</span>
          <span class="pc__hint">طلبات تم تسليمها</span>
        </div>
        <div class="pc__rate">
          <app-progress-ring [value]="rejectionRate()" color="#e34948" label="نسبة الرفض" />
          <span class="pc__label">نسبة الرفض</span>
          <span class="pc__hint">طلبات مرفوضة</span>
        </div>
      </div>

      <div class="pc__open">
        <span class="pc__pulse" aria-hidden="true"></span>
        <span class="pc__open-value" [appCountUp]="openOrders()"></span>
        <span class="pc__open-label">طلب مفتوح قيد المعالجة الآن</span>
      </div>
    </app-dashboard-card>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-width: 0;
      }
      .pc {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .pc__rate {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 14px 8px;
        border-radius: 14px;
        background: var(--bg3);
        text-align: center;

        app-progress-ring {
          margin-bottom: 6px;
        }
      }
      .pc__label {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--txt);
      }
      .pc__hint {
        font-size: 10px;
        color: var(--txt3);
      }
      .pc__open {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: auto;
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--bl-l);
        color: var(--bl-d);
      }
      .pc__pulse {
        width: 9px;
        height: 9px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--bl);
        box-shadow: 0 0 0 0 rgba(27, 95, 168, 0.5);
        animation: pc-pulse 2s infinite;
      }
      .pc__open-value {
        font-size: 18px;
        font-weight: 800;
      }
      .pc__open-label {
        font-size: 11px;
        font-weight: 600;
      }
      @keyframes pc-pulse {
        70% {
          box-shadow: 0 0 0 7px rgba(27, 95, 168, 0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .pc__pulse {
          animation: none;
        }
      }
    `,
  ],
})
export class PerformanceCardComponent {
  readonly completionRate = input.required<number>();
  readonly rejectionRate = input.required<number>();
  readonly openOrders = input.required<number>();
  readonly totalOrders = input.required<number>();
  readonly delay = input<number>(0);

  protected readonly int = formatInteger;
}
