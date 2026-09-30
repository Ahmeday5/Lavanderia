import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DonutChartComponent, DonutSegment } from '../../../../shared/components/charts/donut-chart/donut-chart.component';
import { formatInteger, formatPercent } from '../../../../shared/utils/number-format.util';
import { PhaseSlice } from '../../models/dashboard-insights';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';

/**
 * Part-to-whole of orders by lifecycle phase: donut + interactive legend.
 * Hovering / focusing either one highlights the same phase in both.
 */
@Component({
  selector: 'app-orders-distribution-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardCardComponent, DonutChartComponent],
  template: `
    <app-dashboard-card heading="توزيع الطلبات" subheading="حسب مرحلة الطلب في دورة الحياة" icon="fa-chart-pie" [delay]="delay()">
      <div class="odc">
        <app-donut-chart
          [segments]="segments()"
          [(activeKey)]="hovered"
          [size]="196"
          [thickness]="24"
          centerLabel="إجمالي الطلبات"
        />

        <ul class="odc__legend" aria-label="مفتاح الرسم">
          @for (phase of phases(); track phase.key) {
            <li
              class="odc__item"
              [class.odc__item--dim]="hovered() !== null && hovered() !== phase.key"
              tabindex="0"
              (mouseenter)="hovered.set(phase.key)"
              (mouseleave)="hovered.set(null)"
              (focus)="hovered.set(phase.key)"
              (blur)="hovered.set(null)"
            >
              <span class="odc__swatch" [style.background]="phase.color" aria-hidden="true"></span>
              <i class="fa-solid odc__icon" [class]="phase.icon" aria-hidden="true"></i>
              <span class="odc__label">{{ phase.label }}</span>
              <span class="odc__value">{{ int(phase.value) }}</span>
              <span class="odc__share">{{ pct(phase.share) }}</span>
            </li>
          }
        </ul>
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
      .odc {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 26px;
        flex-wrap: wrap;
        flex: 1;
      }
      .odc__legend {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 200px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .odc__item {
        display: grid;
        grid-template-columns: auto auto 1fr auto auto;
        align-items: center;
        gap: 9px;
        padding: 9px 10px;
        border-radius: 10px;
        font-size: 11.5px;
        transition: background 0.15s ease, opacity 0.2s ease;

        &:hover,
        &:focus-visible {
          background: var(--bg3);
          outline: none;
        }
      }
      .odc__item--dim {
        opacity: 0.4;
      }
      .odc__swatch {
        width: 10px;
        height: 10px;
        border-radius: 3px;
      }
      .odc__icon {
        font-size: 10.5px;
        color: var(--txt3);
      }
      .odc__label {
        font-weight: 600;
        color: var(--txt);
      }
      .odc__value {
        font-weight: 800;
        color: var(--txt);
        font-variant-numeric: tabular-nums;
      }
      .odc__share {
        min-width: 38px;
        font-size: 10.5px;
        font-weight: 600;
        color: var(--txt3);
        text-align: end;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class OrdersDistributionCardComponent {
  readonly phases = input.required<readonly PhaseSlice[]>();
  readonly delay = input<number>(0);

  protected readonly hovered = signal<string | null>(null);
  protected readonly segments = computed<DonutSegment[]>(() =>
    this.phases().map(({ key, label, value, color }) => ({ key, label, value, color })),
  );

  protected readonly int = formatInteger;
  protected readonly pct = formatPercent;
}
