import { signal } from '@angular/core';

/**
 * Reactive set of ids with a request in flight — for per-row button spinners
 * and double-submit protection on list pages.
 *
 *   protected readonly pending = pendingSet<number>();
 *   pending.add(id); …; pending.delete(id);
 *   [disabled]="pending.has(row.id)"
 */
export function pendingSet<K>() {
  const ids = signal<ReadonlySet<K>>(new Set());
  return {
    has: (id: K): boolean => ids().has(id),
    add: (id: K): void => ids.update((s) => new Set(s).add(id)),
    delete: (id: K): void =>
      ids.update((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      }),
  };
}
