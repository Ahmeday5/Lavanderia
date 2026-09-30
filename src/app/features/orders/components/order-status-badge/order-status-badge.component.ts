import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ORDER_STATUS_META, OrderStatus, phaseOf } from '../../models/order-status.model';

/**
 * Status pill: icon + label, tinted by lifecycle phase (color is never the
 * only cue — the icon and text carry the meaning).
 *
 *   <app-order-status-badge [status]="order.status" />
 */
@Component({
  selector: 'app-order-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="osb"
      [class.osb--lg]="size() === 'lg'"
      [style.background]="view().tint"
      [style.color]="view().ink"
      [title]="view().hint"
    >
      <i class="fa-solid" [class]="view().icon" aria-hidden="true"></i>
      {{ view().label }}
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .osb {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 11px;
        border-radius: 999px;
        font-size: 10.5px;
        font-weight: 700;
        white-space: nowrap;

        i {
          font-size: 9.5px;
        }
      }
      .osb--lg {
        padding: 6px 14px;
        font-size: 12px;

        i {
          font-size: 11px;
        }
      }
    `,
  ],
})
export class OrderStatusBadgeComponent {
  readonly status = input.required<OrderStatus | null>();
  readonly size = input<'md' | 'lg'>('md');

  protected readonly view = computed(() => {
    const status = this.status();
    if (status === null) {
      return { label: 'حالة غير معروفة', hint: 'حالة لم يتعرّف عليها النظام', icon: 'fa-circle-question', tint: 'var(--bg3)', ink: 'var(--txt2)' };
    }
    const meta = ORDER_STATUS_META[status];
    const phase = phaseOf(status);
    return { label: meta.label, hint: meta.hint, icon: meta.icon, tint: phase.tint, ink: phase.ink };
  });
}
