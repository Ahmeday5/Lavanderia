import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * "عرض المحذوفين" switch for account lists — soft-deleted accounts are hidden
 * unless the admin asks for them.
 *
 *   <app-deleted-toggle [(checked)]="includeDeleted" />
 */
@Component({
  selector: 'app-deleted-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="dt" [class.dt--on]="checked()" [class.dt--disabled]="disabled()">
      <input
        type="checkbox"
        role="switch"
        class="dt__input"
        [checked]="checked()"
        [disabled]="disabled()"
        [attr.aria-checked]="checked()"
        (change)="checked.set($any($event.target).checked)"
      />
      <span class="dt__track" aria-hidden="true"><span class="dt__thumb"></span></span>
      <span class="dt__label">عرض المحذوفين</span>
    </label>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .dt {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        height: 42px;
        padding: 0 14px;
        border: 1px solid var(--brd2);
        border-radius: 12px;
        background: var(--bg2);
        font: 600 11.5px var(--font-base);
        color: var(--txt2);
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        transition: border-color 0.15s ease, color 0.15s ease;

        &:hover {
          border-color: var(--txt3);
        }
        &--on {
          border-color: var(--txt2);
          color: var(--txt);
        }
        &--disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
      .dt__input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .dt__track {
        position: relative;
        width: 30px;
        height: 17px;
        border-radius: 999px;
        background: var(--brd2);
        transition: background 0.18s ease;
      }
      .dt__thumb {
        position: absolute;
        top: 2px;
        inset-inline-start: 2px;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
        transition: inset-inline-start 0.18s ease;
      }
      .dt--on .dt__track {
        background: var(--txt2);
      }
      .dt--on .dt__thumb {
        inset-inline-start: 15px;
      }
      .dt__input:focus-visible + .dt__track {
        outline: 2px solid var(--bl);
        outline-offset: 2px;
      }
    `,
  ],
})
export class DeletedToggleComponent {
  readonly checked = model(false);
  readonly disabled = input(false);
}
