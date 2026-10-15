import { inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Reads a value handed over through `router.navigate(..., { state })` by the
 * page that triggered the current navigation — e.g. a form passing the record
 * the server just returned to the details page, which can then render it
 * without an extra round-trip.
 *
 *   // sender
 *   this.router.navigate(['/laundries', saved.id], { state: { [LAUNDRY_STATE_KEY]: saved } });
 *   // receiver (field initializer / constructor)
 *   private readonly handedOver = readNavigationState<LaundryDetails>(LAUNDRY_STATE_KEY);
 *
 * Only the *current* navigation is consulted, so a reload or a later visit
 * never resurrects a stale value. Treat the result as a hint: validate it
 * (e.g. that its id matches the route) before using it.
 *
 * Must be called in an injection context, while the navigation is running.
 */
export function readNavigationState<T>(key: string): T | null {
  const state = inject(Router).getCurrentNavigation()?.extras.state;
  const value = state?.[key];
  return value === undefined || value === null ? null : (value as T);
}
