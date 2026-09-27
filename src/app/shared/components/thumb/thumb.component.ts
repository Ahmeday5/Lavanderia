import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/**
 * Square image thumbnail with an icon fallback — used for list rows where
 * the image is optional and the stored URL may be missing or broken.
 *
 *   <app-thumb [src]="service.imageUrl" icon="fa-shirt" [size]="46" />
 *
 * Sizing/background come from the host element, so it can fill an existing
 * styled container (`[size]` = 0) or render standalone.
 */
@Component({
  selector: 'app-thumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showImage()) {
      <img [src]="src()!" [alt]="alt()" loading="lazy" decoding="async" (error)="failedSrc.set(src())" />
    } @else {
      <i class="fa-solid" [class]="icon()" aria-hidden="true"></i>
    }
  `,
  styles: [
    `
      :host {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        overflow: hidden;
        border-radius: inherit;
        line-height: 1;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    `,
  ],
  host: {
    '[style.width]': 'dimension()',
    '[style.height]': 'dimension()',
  },
})
export class ThumbComponent {
  readonly src = input<string | null>(null);
  readonly alt = input('');
  /** Font Awesome icon class used when there's no usable image. */
  readonly icon = input('fa-image');
  /** Pixel size; `0` fills the parent container. */
  readonly size = input(0);

  protected readonly failedSrc = signal<string | null>(null);
  protected readonly showImage = computed(() => {
    const src = this.src();
    return !!src && src !== this.failedSrc();
  });
  protected readonly dimension = computed(() => (this.size() > 0 ? `${this.size()}px` : '100%'));
}
