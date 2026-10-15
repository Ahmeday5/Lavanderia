import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { UserRole } from '../../core/auth/models/auth.model';

/**
 * Renders its host element only for users holding one of the given roles.
 * Reactive: re-evaluates when the session's user changes.
 *
 *   <button *appHasRole="'Admin'">حذف</button>
 *   <a *appHasRole="['Admin', 'Editor']">…</a>
 *
 * Hiding a control is UX, not access control — the backend still enforces
 * the role (403), and routes use `roleGuard`.
 */
@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  readonly appHasRole = input.required<UserRole | ReadonlyArray<UserRole>>();

  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private rendered = false;

  constructor() {
    effect(() => {
      const required = this.appHasRole();
      const roles = typeof required === 'string' ? [required] : required;
      const granted = this.auth.currentUser() !== null && this.auth.hasAnyRole(roles);

      if (granted && !this.rendered) {
        this.vcr.createEmbeddedView(this.tpl);
        this.rendered = true;
      } else if (!granted && this.rendered) {
        this.vcr.clear();
        this.rendered = false;
      }
    });
  }
}
