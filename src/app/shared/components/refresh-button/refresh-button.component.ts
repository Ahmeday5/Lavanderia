import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PageRefreshService } from '../../../core/services/page-refresh.service';

const TICK_MS = 15_000;
const TIME_FMT = new Intl.DateTimeFormat('ar-LY', { hour: 'numeric', minute: '2-digit' });

/**
 * Page-level "refresh data" control. Evicts the cache entries this page used
 * and refetches them (see `PageRefreshService`), and shows how old the data
 * on screen is — so users understand why they might want to refresh.
 *
 *   <app-refresh-button />
 */
@Component({
  selector: 'app-refresh-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="rb"
      [class.rb--busy]="spinning()"
      [disabled]="refresh.isRefreshing()"
      [attr.aria-busy]="spinning()"
      [title]="tooltip()"
      [attr.aria-label]="tooltip()"
      (click)="refresh.refresh()"
    >
      <i class="fa-solid fa-arrows-rotate rb__icon" [class.fa-spin]="spinning()" aria-hidden="true"></i>
      <span class="rb__text">{{ label() }}</span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-shrink: 0;
      }
      .rb {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 42px;
        padding: 0 14px;
        border: 1px solid var(--brd2);
        border-radius: 12px;
        background: var(--bg2);
        color: var(--txt2);
        font: 600 11px var(--font-base);
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s, box-shadow 0.15s;
      }
      .rb:hover:not(:disabled) {
        color: var(--bl);
        border-color: var(--bl);
        box-shadow: 0 0 0 3px rgba(27, 95, 168, 0.1);
      }
      .rb:focus-visible {
        outline: 2px solid var(--bl);
        outline-offset: 2px;
      }
      .rb:disabled {
        cursor: progress;
      }
      .rb--busy {
        color: var(--bl);
      }
      .rb__icon {
        font-size: 13px;
      }
      @media (max-width: 640px) {
        .rb {
          width: 42px;
          padding: 0;
          justify-content: center;
        }
        .rb__text {
          display: none;
        }
      }
    `,
  ],
})
export class RefreshButtonComponent {
  protected readonly refresh = inject(PageRefreshService);
  private readonly now = signal(Date.now());

  protected readonly spinning = computed(() => this.refresh.isRefreshing() || this.refresh.isLoading());

  protected readonly label = computed(() => {
    if (this.refresh.isRefreshing()) return 'جارٍ التحديث…';
    const at = this.refresh.lastUpdated();
    return at === null ? 'تحديث' : `محدّث ${relative(this.now() - at)}`;
  });

  protected readonly tooltip = computed(() => {
    const at = this.refresh.lastUpdated();
    const base = 'تحديث بيانات الصفحة من الخادم';
    return at === null ? base : `${base} — آخر تحديث ${TIME_FMT.format(at)}`;
  });

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}

function relative(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}
