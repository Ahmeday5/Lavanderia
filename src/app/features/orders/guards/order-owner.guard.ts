import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ownerTypeFromSlug, parseOwnerId } from '../models/order-owner.model';

/**
 * Rejects malformed owner URLs (`/orders/banana/abc`) before the page loads,
 * so the page component can trust `ownerType` / `ownerId`. Unknown owners
 * fall back to the dashboard rather than firing a doomed API request.
 */
export const orderOwnerGuard: CanActivateFn = (route) => {
  const valid =
    ownerTypeFromSlug(route.paramMap.get('ownerType')) !== null &&
    parseOwnerId(route.paramMap.get('ownerId')) !== null;
  return valid || inject(Router).createUrlTree(['/dashboard']);
};
