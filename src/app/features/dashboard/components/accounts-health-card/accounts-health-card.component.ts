import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatInteger } from '../../../../shared/utils/number-format.util';
import { AudienceHealth } from '../../models/dashboard-insights';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';

/**
 * Per account type: total, share in good standing, and what needs attention
 * (banned accounts, drivers awaiting approval). Each row links to its list.
 */
@Component({
  selector: 'app-accounts-health-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardCardComponent, RouterLink],
  template: `
    <app-dashboard-card
      heading="صحة الحسابات"
      subheading="الحسابات النشطة مقابل التي تحتاج انتباهك"
      icon="fa-shield-heart"
      [delay]="delay()"
    >
      <ul class="ah">
        @for (a of audiences(); track a.key) {
          <li>
            <a class="ah__item" [routerLink]="a.route">
              <div class="ah__top">
                <span class="ah__name">
                  <i class="fa-solid" [class]="a.icon" aria-hidden="true"></i>
                  {{ a.label }}
                </span>
                <span class="ah__total">{{ int(a.total) }}</span>
              </div>
              <span class="ah__track" [class.ah__track--empty]="a.total === 0" aria-hidden="true">
                <span class="ah__fill" [style.--w]="a.total > 0 ? a.healthyShare : 0"></span>
              </span>
              <span class="ah__meta" [class.ah__meta--alert]="a.flagged > 0">
                @if (a.flagged > 0) {
                  <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                  {{ int(a.flagged) }} {{ a.flaggedLabel }}
                } @else {
                  <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                  لا شيء يحتاج انتباهك
                }
              </span>
            </a>
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
      .ah {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .ah__item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid var(--brd);
        text-decoration: none;
        color: inherit;
        transition: border-color 0.15s ease, background 0.15s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);

        &:hover {
          border-color: rgba(21, 104, 184, 0.3);
          background: rgba(21, 104, 184, 0.03);
          transform: translateX(-3px);
        }
        &:focus-visible {
          outline: 2px solid var(--bl);
          outline-offset: 2px;
        }
      }
      .ah__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .ah__name {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        color: var(--txt);

        i {
          font-size: 11px;
          color: var(--txt3);
        }
      }
      .ah__total {
        font-size: 15px;
        font-weight: 800;
        color: var(--txt);
      }
      .ah__track {
        position: relative;
        height: 6px;
        border-radius: 999px;
        background: var(--re-l);
        overflow: hidden;

        &--empty {
          background: var(--bg3);
        }
      }
      .ah__fill {
        --w: 0;
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        width: calc(var(--w) * 100%);
        border-radius: 999px;
        background: #1baf7a;
        animation: ah-grow 1s 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .ah__meta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 10.5px;
        font-weight: 600;
        color: #0b7a53;

        &--alert {
          color: var(--am);
        }
      }
      @keyframes ah-grow {
        from {
          width: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ah__fill {
          animation: none;
        }
      }
    `,
  ],
})
export class AccountsHealthCardComponent {
  readonly audiences = input.required<readonly AudienceHealth[]>();
  readonly delay = input<number>(0);

  protected readonly int = formatInteger;
}
