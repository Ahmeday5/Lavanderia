import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AccountBadge } from '../../models/account.model';

/**
 * Status chips of an account (active / banned / pending approval / deleted …).
 * Which chips apply is decided by each account model (`laundryBadges`, …);
 * this only renders them, so every page shows a status the same way.
 *
 *   <app-account-badges [badges]="driverBadges(driver)" />
 */
@Component({
  selector: 'app-account-badges',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (badge of badges(); track badge.label) {
      <span [class]="'ab ab--' + badge.tone">
        <i class="fa-solid" [class]="badge.icon" aria-hidden="true"></i>
        {{ badge.label }}
      </span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .ab {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 10.5px;
        font-weight: 600;
        white-space: nowrap;

        i {
          font-size: 9px;
        }
        &--ok {
          background: var(--gr-l);
          color: var(--gr);
        }
        &--warn {
          background: var(--am-l);
          color: var(--am);
        }
        &--bad {
          background: var(--re-l);
          color: var(--re);
        }
        &--info {
          background: var(--bl-l);
          color: var(--bl);
        }
        &--muted {
          background: var(--bg3);
          color: var(--txt2);
        }
      }
    `,
  ],
})
export class AccountBadgesComponent {
  readonly badges = input.required<readonly AccountBadge[]>();
}
