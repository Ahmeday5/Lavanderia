import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PagedQuery, PagedResponse } from '../models/api-response.model';
import { fetchAllPages } from './api-list.util';

/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits → Latin, e.g. for phone-number search. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Normalizes text for forgiving, Arabic-aware matching:
 *   - case-insensitive, trimmed, collapsed whitespace
 *   - strips diacritics (tashkeel) and tatweel (ـ)
 *   - unifies letter variants users type interchangeably:
 *     أ إ آ ٱ → ا · ة → ه · ى → ي · ؤ → و · ئ → ي
 *   - Arabic-Indic digits → Latin digits
 */
export function normalizeSearchText(value: string): string {
  return toLatinDigits(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Adds client-side search to a paged endpoint that has none server-side.
 *
 *   createPagedList(withLocalSearch((q) => this.citiesService.list(q), (c) => [c.name]))
 *
 *   - no search term → passes straight through to server pagination
 *   - with a term    → drains every page (HTTP-cached, so repeated keystrokes
 *                       don't refetch), filters locally, then slices the
 *                       matches into the requested page — so the page UI and
 *                       pagination control behave identically in both modes
 *
 * Every whitespace-separated word must match one of the fields (in any order).
 * Suitable for admin datasets in the hundreds/low thousands; anything larger
 * needs a real server-side search.
 */
export function withLocalSearch<T>(
  fetchPage: (query: PagedQuery) => Observable<PagedResponse<T>>,
  fields: (item: T) => readonly (string | null | undefined)[],
): (query: PagedQuery) => Observable<PagedResponse<T>> {
  return (query) => {
    const pageIndex = query.pageIndex ?? 1;
    const pageSize = query.pageSize ?? 10;
    const terms = normalizeSearchText(query.search ?? '').split(' ').filter(Boolean);

    if (terms.length === 0) return fetchPage({ pageIndex, pageSize });

    return fetchAllPages<T>((index, size) => fetchPage({ pageIndex: index, pageSize: size })).pipe(
      map((all) => {
        const matches = all.filter((item) => {
          const haystack = normalizeSearchText(fields(item).filter(Boolean).join(' '));
          return terms.every((term) => haystack.includes(term));
        });
        const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
        const start = (pageIndex - 1) * pageSize;
        return {
          pageIndex,
          pageSize,
          count: matches.length,
          totalPages: matches.length === 0 ? 0 : totalPages,
          data: matches.slice(start, start + pageSize),
        };
      }),
    );
  };
}
