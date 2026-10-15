import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GlobalSearchUiService } from '../../services/global-search-ui.service';

/** Topbar entry point of the global search — a search-box look-alike that opens the palette. */
@Component({
  selector: 'app-global-search-trigger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="gst"
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
      title="البحث الشامل (Ctrl + K)"
      (click)="ui.open()"
    >
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      <span class="gst__label">ابحث في كل شيء...</span>
      <kbd class="gst__kbd">Ctrl K</kbd>
    </button>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-width: 0;
        max-width: 380px;
      }
      .gst {
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        height: 38px;
        padding: 0 12px;
        border: 1px solid var(--brd2);
        border-radius: 11px;
        background: var(--bg3);
        color: var(--txt3);
        font: 500 12px var(--font-base);
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;

        &:hover {
          border-color: var(--brand);
          background: var(--bg2);
        }
        &:focus-visible {
          outline: 2px solid var(--bl);
          outline-offset: 2px;
        }
      }
      .gst__label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: start;
      }
      .gst__kbd {
        padding: 1px 6px;
        border-radius: 5px;
        border: 1px solid var(--brd2);
        background: var(--bg2);
        font: 600 10px var(--font-base);
        color: var(--txt2);
        direction: ltr;
      }
      @media (max-width: 768px) {
        :host {
          flex: 0 0 auto;
        }
        .gst {
          width: 38px;
          justify-content: center;
          padding: 0;
        }
        .gst__label,
        .gst__kbd {
          display: none;
        }
      }
    `,
  ],
})
export class GlobalSearchTriggerComponent {
  protected readonly ui = inject(GlobalSearchUiService);
}
