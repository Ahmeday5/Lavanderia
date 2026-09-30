import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { formatInteger, formatPercent } from '../../../../shared/utils/number-format.util';
import { StatusRow } from '../../models/dashboard-insights';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';

/**
 * Orders per status as horizontal bars, in lifecycle order. Bars are colored
 * by phase (same colors as the distribution donut); every bar carries its
 * icon, label, count and share, so color is never the only cue.
 */
@Component({
  selector: 'app-status-breakdown-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardCardComponent],
  template: `
    <app-dashboard-card
      heading="الطلبات حسب الحالة"
      subheading="عدد الطلبات في كل حالة، بترتيب مسار الطلب"
      icon="fa-chart-bar"
      [delay]="delay()"
    >
      <ul class="sb">
        @for (row of rows(); track row.status; let i = $index) {
          <li class="sb__row" [class.sb__row--zero]="row.value === 0" [title]="row.hint">
            <span class="sb__label">
              <i class="fa-solid" [class]="row.icon" [style.color]="row.color" aria-hidden="true"></i>
              {{ row.label }}
            </span>
            <span class="sb__track" aria-hidden="true">
              <span
                class="sb__fill"
                [style.background]="row.color"
                [style.--w]="row.barRatio"
                [style.animation-delay.ms]="300 + i * 60"
              ></span>
            </span>
            <span class="sb__value">
              {{ int(row.value) }}
              <small>{{ pct(row.share) }}</small>
            </span>
          </li>
        }
      </ul>
    </app-dashboard-card>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-width: 0;
      }
      .sb {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .sb__row {
        display: grid;
        grid-template-columns: minmax(150px, 38%) 1fr 64px;
        align-items: center;
        gap: 12px;
        padding: 5px 6px;
        border-radius: 8px;
        font-size: 11px;
        transition: background 0.15s ease;

        &:hover {
          background: var(--bg3);
        }
      }
      .sb__label {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        font-weight: 600;
        color: var(--txt);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        i {
          width: 14px;
          flex-shrink: 0;
          font-size: 10.5px;
          text-align: center;
        }
      }
      .sb__track {
        position: relative;
        height: 10px;
        border-radius: 999px;
        background: var(--bg3);
        overflow: hidden;
      }
      .sb__fill {
        --w: 0;
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        width: max(6px, calc(var(--w) * 100%));
        border-radius: 999px;
        animation: sb-grow 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .sb__row--zero {
        .sb__label {
          color: var(--txt3);
        }
        .sb__fill {
          display: none;
        }
      }
      .sb__value {
        display: flex;
        align-items: baseline;
        justify-content: flex-end;
        gap: 5px;
        font-weight: 800;
        color: var(--txt);
        font-variant-numeric: tabular-nums;

        small {
          font-size: 9.5px;
          font-weight: 600;
          color: var(--txt3);
        }
      }
      @keyframes sb-grow {
        from {
          width: 0;
        }
      }
      @media (max-width: 576px) {
        .sb__row {
          grid-template-columns: minmax(0, 1fr) 56px;
        }
        .sb__track {
          grid-column: 1 / -1;
          grid-row: 2;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .sb__fill {
          animation: none;
        }
      }
    `,
  ],
})
export class StatusBreakdownCardComponent {
  readonly rows = input.required<readonly StatusRow[]>();
  readonly delay = input<number>(0);

  protected readonly int = formatInteger;
  protected readonly pct = formatPercent;
}
