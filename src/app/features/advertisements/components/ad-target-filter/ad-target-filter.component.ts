import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AD_TARGET_META, AD_TARGET_TYPES, AdTargetType } from '../../models/advertisement.model';

/**
 * Single-select audience filter as a chip row ("الكل" + every target type).
 * Stateless: the page owns the selection (it lives in the URL), this only
 * renders it and reports clicks.
 *
 *   <app-ad-target-filter [value]="target()" [disabled]="loading" (valueChange)="setTarget($event)" />
 */
@Component({
  selector: 'app-ad-target-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="atf" role="radiogroup" aria-label="تصفية الإعلانات حسب الفئة المستهدفة">
      <button
        type="button"
        role="radio"
        class="atf__chip"
        [class.atf__chip--on]="value() === null"
        [attr.aria-checked]="value() === null"
        [disabled]="disabled()"
        (click)="select(null)"
      >
        <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
        كل الفئات
      </button>

      @for (target of targets; track target) {
        <button
          type="button"
          role="radio"
          class="atf__chip"
          [class.atf__chip--on]="value() === target"
          [attr.aria-checked]="value() === target"
          [style.--chip-color]="meta[target].color"
          [style.--chip-ink]="meta[target].ink"
          [style.--chip-tint]="meta[target].tint"
          [title]="meta[target].hint"
          [disabled]="disabled()"
          (click)="select(target)"
        >
          <i class="fa-solid" [class]="meta[target].icon" aria-hidden="true"></i>
          {{ meta[target].label }}
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
      .atf {
        display: flex;
        gap: 8px;
        padding: 2px;
        overflow-x: auto;
        scrollbar-width: thin;
      }
      .atf__chip {
        --chip-color: var(--bl);
        --chip-ink: var(--bl);
        --chip-tint: var(--bl-l);
        display: inline-flex;
        align-items: center;
        gap: 7px;
        flex-shrink: 0;
        height: 38px;
        padding: 0 15px;
        border: 1px solid var(--brd2);
        border-radius: 999px;
        background: var(--bg2);
        color: var(--txt2);
        font: 600 11.5px var(--font-base);
        white-space: nowrap;
        cursor: pointer;
        transition:
          background 0.18s ease,
          color 0.18s ease,
          border-color 0.18s ease,
          transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
          box-shadow 0.18s ease;

        i {
          font-size: 10.5px;
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
      .atf__chip--on,
      .atf__chip--on:hover:not(:disabled) {
        border-color: var(--chip-color);
        background: var(--chip-tint);
        color: var(--chip-ink);
        box-shadow: 0 6px 16px -10px var(--chip-color);
      }
    `,
  ],
})
export class AdTargetFilterComponent {
  readonly value = input.required<AdTargetType | null>();
  readonly disabled = input<boolean>(false);
  readonly valueChange = output<AdTargetType | null>();

  protected readonly targets = AD_TARGET_TYPES;
  protected readonly meta = AD_TARGET_META;

  protected select(target: AdTargetType | null): void {
    if (target !== this.value()) this.valueChange.emit(target);
  }
}
