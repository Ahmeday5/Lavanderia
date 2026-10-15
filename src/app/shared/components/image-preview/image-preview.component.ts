import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

/**
 * Captioned image tile that opens a full-size lightbox on click — for
 * documents an admin must inspect (ID cards, licences, vehicle photos) before
 * approving an account. Falls back to a placeholder when the image is missing
 * or fails to load.
 *
 *   <app-image-preview label="الوجه الأمامي للبطاقة" [src]="driver.nationalIdFrontImageUrl" />
 */
@Component({
  selector: 'app-image-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    <figure class="ipv">
      @if (hasImage()) {
        <button type="button" class="ipv__frame" (click)="isOpen.set(true)" [attr.aria-label]="'عرض ' + label()">
          <img [src]="src()!" [alt]="label()" loading="lazy" decoding="async" (error)="failedSrc.set(src())" />
          <span class="ipv__zoom" aria-hidden="true"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
        </button>
      } @else {
        <div class="ipv__frame ipv__frame--empty">
          <i class="fa-regular fa-image" aria-hidden="true"></i>
          <span>لا توجد صورة</span>
        </div>
      }
      <figcaption class="ipv__caption">{{ label() }}</figcaption>
    </figure>

    <app-modal [open]="isOpen()" [title]="label()" size="xl" (closed)="isOpen.set(false)">
      @if (hasImage()) {
        <div class="ipv__full">
          <img [src]="src()!" [alt]="label()" />
        </div>
        <a class="ipv__open" [href]="src()!" target="_blank" rel="noopener noreferrer">
          <i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i>
          فتح الصورة في تبويب جديد
        </a>
      }
    </app-modal>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .ipv {
        margin: 0;
      }
      .ipv__frame {
        position: relative;
        display: grid;
        place-items: center;
        width: 100%;
        aspect-ratio: 4 / 3;
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--brd);
        border-radius: 12px;
        background: var(--bg3);
        cursor: zoom-in;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.25s ease;
        }
        &:hover img {
          transform: scale(1.04);
        }
        &:hover .ipv__zoom {
          opacity: 1;
        }
        &:focus-visible {
          outline: 2px solid var(--bl);
          outline-offset: 2px;
        }
        &--empty {
          gap: 6px;
          align-content: center;
          border-style: dashed;
          color: var(--txt3);
          font-size: 11px;
          cursor: default;

          i {
            font-size: 20px;
          }
        }
      }
      .ipv__zoom {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(5, 7, 13, 0.35);
        color: #fff;
        font-size: 20px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .ipv__caption {
        margin-top: 6px;
        font-size: 11px;
        font-weight: 600;
        color: var(--txt2);
        text-align: center;
      }
      .ipv__full {
        display: grid;
        place-items: center;
        max-height: 70vh;
        overflow: auto;
        border-radius: 10px;
        background: var(--bg3);

        img {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
        }
      }
      .ipv__open {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--brand);
        text-decoration: none;
      }
    `,
  ],
})
export class ImagePreviewComponent {
  readonly src = input<string | null>(null);
  readonly label = input.required<string>();

  protected readonly isOpen = signal(false);
  protected readonly failedSrc = signal<string | null>(null);
  protected readonly hasImage = computed(() => {
    const src = this.src();
    return !!src && src !== this.failedSrc();
  });
}
