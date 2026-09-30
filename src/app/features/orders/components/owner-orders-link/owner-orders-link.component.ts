import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderOwnerType, ownerOrdersLink } from '../../models/order-owner.model';

/**
 * "View orders" action for a customer / laundry / driver row — the one entry
 * point into `/orders/:ownerType/:ownerId`, so list pages never hand-build
 * that URL.
 *
 *   <app-owner-orders-link ownerType="Driver" [ownerId]="d.id" [ownerName]="d.fullName" />
 */
@Component({
  selector: 'app-owner-orders-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <a
      class="ool"
      [routerLink]="link()"
      [queryParams]="ownerName() ? { name: ownerName() } : null"
      [attr.aria-label]="'عرض طلبات ' + (ownerName() || '#' + ownerId())"
    >
      <i class="fa-solid fa-receipt" aria-hidden="true"></i>
      <span>الطلبات</span>
    </a>
  `,
  styles: [
    `
      @use '../../../../shared/styles/responsive-table' as rt;

      :host {
        display: inline-flex;
        vertical-align: middle;
        margin-inline-end: 6px;
      }
      .ool {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        height: 32px;
        padding: 0 13px;
        border: 1px solid rgba(21, 104, 184, 0.35);
        border-radius: 8px;
        background: rgba(21, 104, 184, 0.06);
        color: #1568b8;
        font: 600 10.5px var(--font-base);
        white-space: nowrap;
        text-decoration: none;
        transition: all 0.15s ease;

        i {
          font-size: 10px;
        }
        &:hover {
          border-color: #1568b8;
          background: #1568b8;
          color: #fff;
        }
        &:focus-visible {
          outline: 2px solid #1568b8;
          outline-offset: 2px;
        }
      }
      // Card layout on narrow screens: full-width, stacked above the row's other action.
      @media (max-width: rt.$cards-breakpoint) {
        :host {
          display: flex;
          width: 100%;
          margin: 0 0 8px;
        }
        .ool {
          width: 100%;
          height: 36px;
        }
      }
    `,
  ],
})
export class OwnerOrdersLinkComponent {
  readonly ownerType = input.required<OrderOwnerType>();
  readonly ownerId = input.required<number>();
  readonly ownerName = input<string>('');

  protected readonly link = computed(() => ownerOrdersLink(this.ownerType(), this.ownerId()));
}
