import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CountUpDirective } from '../../../../shared/directives/count-up.directive';
import { formatMoney, formatPercent } from '../../../../shared/utils/number-format.util';
import { WalletSlice } from '../../models/dashboard-insights';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';

/** Revenue headline + how wallet balances split between laundries and drivers. */
@Component({
  selector: 'app-finance-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardCardComponent, CountUpDirective],
  template: `
    <app-dashboard-card heading="الأرصدة المالية" subheading="الإيرادات وأرصدة المحافظ" icon="fa-wallet" [delay]="delay()">
      <div class="fc__hero">
        <span class="fc__hero-label">إجمالي الإيرادات</span>
        <span class="fc__hero-value" [appCountUp]="totalRevenue()" [countUpFormat]="money"></span>
        <span class="fc__hero-today">
          <i class="fa-solid fa-arrow-trend-up" aria-hidden="true"></i>
          {{ money(revenueToday()) }} اليوم
        </span>
      </div>

      <div class="fc__wallets">
        <div class="fc__head">
          <span>أرصدة المحافظ</span>
          <strong>{{ money(walletsTotal()) }}</strong>
        </div>

        <!-- Proportional stacked bar; the list below carries the exact numbers. -->
        <div class="fc__stack" aria-hidden="true">
          @for (w of wallets(); track w.key) {
            @if (w.value > 0) {
              <span class="fc__seg" [style.flex-grow]="w.share" [style.background]="w.color" [title]="w.label + ': ' + money(w.value)"></span>
            }
          }
        </div>

        <ul class="fc__list">
          @for (w of wallets(); track w.key) {
            <li>
              <span class="fc__swatch" [style.background]="w.color" aria-hidden="true"></span>
              <i class="fa-solid" [class]="w.icon" aria-hidden="true"></i>
              <span class="fc__name">{{ w.label }}</span>
              <span class="fc__value">{{ money(w.value) }}</span>
              <span class="fc__share">{{ pct(w.share) }}</span>
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
      .fc__hero {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 16px;
        border-radius: 14px;
        color: #fff;
        background: linear-gradient(135deg, #0f6e56 0%, #0b4d3c 60%, #062a21 100%);
        box-shadow: 0 14px 28px -18px rgba(15, 110, 86, 0.8);
      }
      .fc__hero-label {
        font-size: 10.5px;
        color: rgba(255, 255, 255, 0.75);
      }
      .fc__hero-value {
        font-size: 22px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }
      .fc__hero-today {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 10.5px;
        color: rgba(255, 255, 255, 0.85);
      }
      .fc__wallets {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .fc__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        font-size: 11px;
        color: var(--txt2);

        strong {
          font-size: 13px;
          color: var(--txt);
        }
      }
      .fc__stack {
        display: flex;
        gap: 2px;
        height: 12px;
        border-radius: 999px;
        overflow: hidden;
        background: var(--bg3);
      }
      .fc__seg {
        flex-basis: 0;
        min-width: 6px;
        animation: fc-grow 0.9s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .fc__list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin: 0;
        padding: 0;
        list-style: none;

        li {
          display: grid;
          grid-template-columns: auto auto 1fr auto auto;
          align-items: center;
          gap: 8px;
          font-size: 11px;
        }
        i {
          font-size: 10px;
          color: var(--txt3);
        }
      }
      .fc__swatch {
        width: 10px;
        height: 10px;
        border-radius: 3px;
      }
      .fc__name {
        color: var(--txt2);
      }
      .fc__value {
        font-weight: 800;
        color: var(--txt);
        font-variant-numeric: tabular-nums;
      }
      .fc__share {
        min-width: 38px;
        font-size: 10.5px;
        font-weight: 600;
        color: var(--txt3);
        text-align: end;
      }
      @keyframes fc-grow {
        from {
          flex-grow: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .fc__seg {
          animation: none;
        }
      }
    `,
  ],
})
export class FinanceCardComponent {
  readonly totalRevenue = input.required<number>();
  readonly revenueToday = input.required<number>();
  readonly wallets = input.required<readonly WalletSlice[]>();
  readonly walletsTotal = input.required<number>();
  readonly delay = input<number>(0);

  protected readonly money = formatMoney;
  protected readonly pct = formatPercent;
}
