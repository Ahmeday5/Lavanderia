import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  input,
  model,
  signal,
} from '@angular/core';
import { formatInteger, formatPercent, ratioOf } from '../../../utils/number-format.util';

export interface DonutSegment {
  /** Stable identity — color and hover state follow the key, never the index. */
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutArc extends DonutSegment {
  dash: string;
  offset: number;
  share: number;
}

/** Surface gap between neighbouring arcs, in SVG units along the circumference. */
const ARC_GAP = 2.5;

/**
 * Dependency-free SVG donut for part-to-whole at a glance (≤ 6 segments).
 *
 *   <app-donut-chart
 *     [segments]="phases()"
 *     [(activeKey)]="hovered"
 *     centerLabel="إجمالي الطلبات" />
 *
 * The center doubles as the hover read-out: pointing at an arc (or at a
 * legend row bound to the same `activeKey`) swaps it to that segment's value
 * and share. Arcs draw in on first render; the chart carries an `aria-label`
 * summary, but callers should always render a legend with the numbers too —
 * color is never the only encoding.
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dc" [style.width.px]="size()" [style.height.px]="size()">
      <svg
        [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
        role="img"
        [attr.aria-label]="summary()"
        (mouseleave)="activeKey.set(null)"
      >
        <circle
          class="dc__track"
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          [attr.stroke-width]="thickness()"
        />
        <g [attr.transform]="'rotate(-90 ' + center() + ' ' + center() + ')'">
          @for (arc of arcs(); track arc.key) {
            <circle
              class="dc__arc"
              [class.dc__arc--dim]="activeKey() !== null && activeKey() !== arc.key"
              [class.dc__arc--active]="activeKey() === arc.key"
              [attr.cx]="center()"
              [attr.cy]="center()"
              [attr.r]="radius()"
              [attr.stroke]="arc.color"
              [attr.stroke-width]="thickness()"
              [attr.stroke-dasharray]="drawn() ? arc.dash : '0 ' + circumference()"
              [attr.stroke-dashoffset]="-arc.offset"
              (mouseenter)="activeKey.set(arc.key)"
            >
              <title>{{ arc.label }}: {{ fmt(arc.value) }} ({{ pct(arc.share) }})</title>
            </circle>
          }
        </g>
      </svg>

      <div class="dc__center" aria-hidden="true">
        @if (active(); as seg) {
          <span class="dc__value" [style.color]="seg.color">{{ fmt(seg.value) }}</span>
          <span class="dc__label">{{ seg.label }}</span>
          <span class="dc__share">{{ pct(seg.share) }}</span>
        } @else {
          <span class="dc__value">{{ fmt(total()) }}</span>
          <span class="dc__label">{{ centerLabel() }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        justify-content: center;
      }
      .dc {
        position: relative;
        max-width: 100%;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .dc__track {
        fill: none;
        stroke: var(--bg3);
      }
      .dc__arc {
        fill: none;
        cursor: pointer;
        transition:
          stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1),
          opacity 0.2s ease,
          stroke-width 0.2s ease;
      }
      .dc__arc--dim {
        opacity: 0.28;
      }
      .dc__center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        pointer-events: none;
        text-align: center;
      }
      .dc__value {
        font-size: 26px;
        font-weight: 800;
        line-height: 1.1;
        color: var(--txt);
        transition: color 0.2s ease;
      }
      .dc__label {
        max-width: 70%;
        font-size: 10.5px;
        font-weight: 600;
        color: var(--txt2);
      }
      .dc__share {
        font-size: 11px;
        font-weight: 700;
        color: var(--txt3);
      }
      @media (prefers-reduced-motion: reduce) {
        .dc__arc {
          transition: none;
        }
      }
    `,
  ],
})
export class DonutChartComponent {
  readonly segments = input.required<readonly DonutSegment[]>();
  readonly size = input<number>(200);
  readonly thickness = input<number>(22);
  readonly centerLabel = input<string>('');
  /** Hovered segment key — two-way bindable so a legend can drive it too. */
  readonly activeKey = model<string | null>(null);

  /** Flipped after first paint so the arcs transition in from zero. */
  protected readonly drawn = signal(false);

  protected readonly center = computed(() => this.size() / 2);
  protected readonly radius = computed(() => (this.size() - this.thickness()) / 2 - 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly total = computed(() =>
    this.segments().reduce((sum, s) => sum + Math.max(0, s.value), 0),
  );

  protected readonly arcs = computed<DonutArc[]>(() => {
    const total = this.total();
    const circ = this.circumference();
    const visible = this.segments().filter((s) => s.value > 0);
    const gap = visible.length > 1 ? ARC_GAP : 0;

    let offset = 0;
    return visible.map((segment) => {
      const share = ratioOf(segment.value, total);
      const length = share * circ;
      const arc: DonutArc = {
        ...segment,
        share,
        offset: offset + gap / 2,
        dash: `${Math.max(0, length - gap)} ${circ}`,
      };
      offset += length;
      return arc;
    });
  });

  protected readonly active = computed(() => {
    const key = this.activeKey();
    return key === null ? null : (this.arcs().find((a) => a.key === key) ?? null);
  });

  protected readonly summary = computed(() => {
    const parts = this.arcs().map((a) => `${a.label} ${formatInteger(a.value)}`);
    return `${this.centerLabel()} ${formatInteger(this.total())}${parts.length ? ': ' + parts.join('، ') : ''}`;
  });

  protected readonly fmt = formatInteger;
  protected readonly pct = formatPercent;

  constructor() {
    afterNextRender(() => requestAnimationFrame(() => this.drawn.set(true)));
  }
}
