import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
  OrderStatus,
  phaseOf,
} from '../../models/order-status.model';

/**
 * Single-select status filter as a horizontally scrollable chip row
 * ("الكل" + every status). Stateless: the page owns the selection (it lives
 * in the URL), this only renders it and reports clicks.
 *
 *   <app-order-status-filter [value]="status()" [disabled]="loading" (valueChange)="setStatus($event)" />
 */
@Component({
  selector: 'app-order-status-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="osf" role="radiogroup" aria-label="تصفية الطلبات حسب الحالة">
      <button
        type="button"
        role="radio"
        class="osf__chip"
        [class.osf__chip--on]="value() === null"
        [attr.aria-checked]="value() === null"
        [disabled]="disabled()"
        (click)="select(null)"
      >
        <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
        كل الحالات
      </button>

      @for (status of statuses; track status) {
        <button
          type="button"
          role="radio"
          class="osf__chip"
          [class.osf__chip--on]="value() === status"
          [attr.aria-checked]="value() === status"
          [style.--chip-color]="phase(status).color"
          [style.--chip-ink]="phase(status).ink"
          [style.--chip-tint]="phase(status).tint"
          [title]="meta[status].hint"
          [disabled]="disabled()"
          (click)="select(status)"
        >
          <span class="osf__dot" aria-hidden="true"></span>
          {{ meta[status].label }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .osf {
        display: flex;
        gap: 8px;
        padding: 2px 2px 8px;
        overflow-x: auto;
        scrollbar-width: thin;
        scroll-snap-type: x proximity;
      }
      .osf__chip {
        --chip-color: var(--bl);
        --chip-ink: var(--bl);
        --chip-tint: var(--bl-l);
        display: inline-flex;
        align-items: center;
        gap: 7px;
        flex-shrink: 0;
        height: 36px;
        padding: 0 14px;
        border: 1px solid var(--brd2);
        border-radius: 999px;
        background: var(--bg2);
        color: var(--txt2);
        font: 600 11px var(--font-base);
        white-space: nowrap;
        cursor: pointer;
        scroll-snap-align: start;
        transition:
          background 0.18s ease,
          color 0.18s ease,
          border-color 0.18s ease,
          transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
          box-shadow 0.18s ease;

        i {
          font-size: 10px;
        }
        &:hover:not(:disabled) {
          border-color: var(--chip-color);
          color: var(--chip-ink);
          transform: translateY(-1px);
        }
        &:focus-visible {
          outline: 2px solid var(--chip-color);
          outline-offset: 2px;
        }
        &:disabled {
          cursor: progress;
          opacity: 0.7;
        }
      }
      .osf__chip--on,
      .osf__chip--on:hover:not(:disabled) {
        border-color: var(--chip-color);
        background: var(--chip-tint);
        color: var(--chip-ink);
        box-shadow: 0 6px 16px -10px var(--chip-color);
      }
      .osf__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--chip-color);
        box-shadow: 0 0 0 2px var(--bg2);
      }
    `,
  ],
})
export class OrderStatusFilterComponent {
  readonly value = input.required<OrderStatus | null>();
  readonly disabled = input<boolean>(false);
  readonly valueChange = output<OrderStatus | null>();

  protected readonly statuses = ORDER_STATUSES;
  protected readonly meta = ORDER_STATUS_META;
  protected readonly phase = phaseOf;

  protected select(status: OrderStatus | null): void {
    if (status !== this.value()) this.valueChange.emit(status);
  }
}
