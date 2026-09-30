import {
  DestroyRef,
  Directive,
  ElementRef,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { formatInteger } from '../utils/number-format.util';

const DEFAULT_DURATION_MS = 900;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Animates a number from its previous value to the new one ("odometer" feel),
 * writing the formatted result into the host's text.
 *
 *   <span [appCountUp]="stats.totalOrders"></span>
 *   <span [appCountUp]="stats.totalRevenue" [countUpFormat]="formatMoney"></span>
 *
 * - Honors `prefers-reduced-motion`: the final value is written immediately.
 * - A new value mid-animation continues from what is currently on screen,
 *   so refreshes never "jump back" to zero.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective {
  readonly appCountUp = input.required<number>();
  readonly countUpFormat = input<(value: number) => string>(formatInteger);
  readonly countUpDuration = input<number>(DEFAULT_DURATION_MS);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  private displayed = 0;
  private frame: number | null = null;

  constructor() {
    effect(() => {
      const target = Number.isFinite(this.appCountUp()) ? this.appCountUp() : 0;
      const format = this.countUpFormat();
      const duration = this.countUpDuration();
      untracked(() => this.animateTo(target, format, duration));
    });

    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  private animateTo(target: number, format: (value: number) => string, duration: number): void {
    this.cancel();
    const from = this.displayed;

    if (this.reducedMotion || duration <= 0 || from === target) {
      this.render(target, format);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      this.render(from + (target - from) * easeOutCubic(progress), format);
      if (progress < 1) {
        this.frame = requestAnimationFrame(step);
      } else {
        this.frame = null;
        this.render(target, format); // land exactly, free of float drift
      }
    };
    this.frame = requestAnimationFrame(step);
  }

  private render(value: number, format: (value: number) => string): void {
    this.displayed = value;
    this.host.textContent = format(value);
  }

  private cancel(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
}
