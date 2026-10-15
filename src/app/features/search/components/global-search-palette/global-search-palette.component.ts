import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { HighlightComponent } from '../../../../shared/components/highlight/highlight.component';
import { ThumbComponent } from '../../../../shared/components/thumb/thumb.component';
import { AccountBadgesComponent } from '../../../accounts/components/account-badges/account-badges.component';
import { GlobalSearchService } from '../../services/global-search.service';
import { GlobalSearchUiService } from '../../services/global-search-ui.service';
import { SearchLink, SearchSection, toSearchSections } from '../../models/search-sections';

const SEARCH_DEBOUNCE_MS = 350;

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading'; query: string }
  | { kind: 'done'; query: string; total: number; sections: SearchSection[] }
  | { kind: 'error'; query: string; message: string };

/**
 * Command-palette style global search (`Ctrl/⌘ + K`). Mounted once in the
 * main layout; opened from anywhere via the shortcut or the topbar trigger.
 *
 *   - debounced; a blank query never hits the server (it would answer 400)
 *   - `switchMap` cancels the in-flight request on every new query, so a slow
 *     older response can never overwrite newer results
 *   - grouped results, ↑ ↓ to move, Enter to open, Esc to close
 *   - ARIA combobox + listbox, focus returned to where it was on close
 */
@Component({
  selector: 'app-global-search-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HighlightComponent, ThumbComponent, AccountBadgesComponent],
  templateUrl: './global-search-palette.component.html',
  styleUrl: './global-search-palette.component.scss',
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class GlobalSearchPaletteComponent {
  private readonly searchService = inject(GlobalSearchService);
  private readonly router = inject(Router);
  protected readonly ui = inject(GlobalSearchUiService);

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly results = viewChild<ElementRef<HTMLElement>>('results');

  protected readonly query = signal('');
  protected readonly state = signal<SearchState>({ kind: 'idle' });
  protected readonly activeIndex = signal(0);

  private readonly query$ = new Subject<string>();
  private returnFocusTo: HTMLElement | null = null;

  /** Last completed results — kept on screen while the next query loads, to avoid flicker. */
  protected readonly sections = signal<SearchSection[]>([]);

  /** Every selectable entry in display order — what ↑ ↓ walk through. */
  private readonly entries = computed(() => this.sections().flatMap((section) => section.entries));

  /** Sections with each entry's position in `entries`, for the template. */
  protected readonly rows = computed(() => {
    let index = 0;
    return this.sections().map((section) => ({
      section,
      entries: section.entries.map((entry) => ({ entry, index: index++ })),
    }));
  });

  protected readonly activeKey = computed(() => this.entries()[this.activeIndex()]?.key ?? null);

  constructor() {
    this.query$
      .pipe(
        map((value) => value.trim()),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) =>
          query === ''
            ? of<SearchState>({ kind: 'idle' })
            : this.searchService.search(query).pipe(
                map((result): SearchState => ({
                  kind: 'done',
                  query,
                  total: result.totalCount,
                  sections: toSearchSections(result, query),
                })),
                catchError((err: ApiError) =>
                  of<SearchState>({
                    kind: 'error',
                    query,
                    message: apiErrorToMessage(err, 'تعذّر إجراء البحث. حاول مرة أخرى.'),
                  }),
                ),
                startWith<SearchState>({ kind: 'loading', query }),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.state.set(state);
        if (state.kind === 'loading') return;
        this.sections.set(state.kind === 'done' ? state.sections : []);
        this.activeIndex.set(0);
      });

    // Any navigation (a result, a link elsewhere, back button) closes the palette.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.close());

    effect(() => {
      if (!this.ui.isOpen()) return;
      untracked(() => this.onOpened());
    });
  }

  // ── open / close ──

  private onOpened(): void {
    this.returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.query.set('');
    this.state.set({ kind: 'idle' });
    this.sections.set([]);
    this.query$.next('');
    queueMicrotask(() => this.input()?.nativeElement.focus());
  }

  protected close(): void {
    if (!this.ui.isOpen()) return;
    this.ui.close();
    this.returnFocusTo?.focus?.();
    this.returnFocusTo = null;
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    const isShortcut = (event.ctrlKey || event.metaKey) && (event.code === 'KeyK' || event.key.toLowerCase() === 'k');
    if (isShortcut) {
      event.preventDefault();
      if (this.ui.isOpen()) this.close();
      else this.ui.open();
      return;
    }
    if (this.ui.isOpen() && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }

  // ── input & keyboard navigation ──

  protected onInput(value: string): void {
    this.query.set(value);
    this.query$.next(value);
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    const total = this.entries().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (total) this.moveTo((this.activeIndex() + 1) % total);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (total) this.moveTo((this.activeIndex() - 1 + total) % total);
        break;
      case 'Enter': {
        event.preventDefault();
        const entry = this.entries()[this.activeIndex()];
        if (entry) this.open(entry.link);
        break;
      }
    }
  }

  protected setActive(index: number): void {
    this.activeIndex.set(index);
  }

  private moveTo(index: number): void {
    this.activeIndex.set(index);
    const key = this.entries()[index]?.key;
    if (!key) return;
    queueMicrotask(() =>
      this.results()?.nativeElement.querySelector(`#gs-opt-${key}`)?.scrollIntoView({ block: 'nearest' }),
    );
  }

  protected open(link: SearchLink): void {
    this.ui.close();
    this.returnFocusTo = null;
    void this.router.navigate(link.commands, { queryParams: link.queryParams });
  }
}
