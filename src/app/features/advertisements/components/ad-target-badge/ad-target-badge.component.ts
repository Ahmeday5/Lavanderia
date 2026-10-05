import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AD_TARGET_META, AdTargetType } from '../../models/advertisement.model';

/**
 * Pill showing who an advertisement targets. Renders a neutral "غير محدد"
 * for audiences the dashboard doesn't know (see `toAdvertisement`).
 *
 *   <app-ad-target-badge [target]="ad.targetType" />
 */
@Component({
  selector: 'app-ad-target-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="atb"
      [style.--badge-color]="meta()?.color"
      [style.--badge-ink]="meta()?.ink"
      [style.--badge-tint]="meta()?.tint"
    >
      <i class="fa-solid" [class]="meta()?.icon ?? 'fa-circle-question'" aria-hidden="true"></i>
      {{ meta()?.label ?? 'غير محدد' }}
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .atb {
        --badge-color: var(--brd2);
        --badge-ink: var(--txt2);
        --badge-tint: var(--bg3);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--badge-color) 35%, transparent);
        background: var(--badge-tint);
        color: var(--badge-ink);
        font: 700 10.5px var(--font-base);
        white-space: nowrap;

        i {
          font-size: 9.5px;
        }
      }
    `,
  ],
})
export class AdTargetBadgeComponent {
  readonly target = input.required<AdTargetType | null>();

  protected readonly meta = computed(() => {
    const target = this.target();
    return target ? AD_TARGET_META[target] : null;
  });
}
