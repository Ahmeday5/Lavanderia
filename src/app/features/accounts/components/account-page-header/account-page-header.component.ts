import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThumbComponent } from '../../../../shared/components/thumb/thumb.component';
import { AccountBadgesComponent } from '../account-badges/account-badges.component';
import { AccountBadge } from '../../models/account.model';

/**
 * Header of an account details / form page: back link, avatar, name, status
 * chips and the page's actions (projected).
 *
 *   <app-account-page-header backLink="/drivers" backLabel="السائقون"
 *       [title]="driver.fullName" icon="fa-motorcycle" [badges]="badges()">
 *     <button …>تعديل</button>
 *   </app-account-page-header>
 */
@Component({
  selector: 'app-account-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ThumbComponent, AccountBadgesComponent],
  template: `
    <nav class="aph__crumbs" aria-label="مسار التنقل">
      <a class="aph__back" [routerLink]="backLink()">
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        {{ backLabel() }}
      </a>
      @if (crumb()) {
        <span class="aph__sep" aria-hidden="true">/</span>
        <span class="aph__crumb">{{ crumb() }}</span>
      }
    </nav>

    <header class="aph" [class.aph--muted]="muted()">
      <div class="aph__avatar">
        <app-thumb [src]="imageUrl()" [alt]="title()" [icon]="icon()" />
      </div>
      <div class="aph__text">
        <h1 class="aph__title">{{ title() || '—' }}</h1>
        <div class="aph__meta">
          @if (subtitle()) {
            <span class="aph__subtitle">{{ subtitle() }}</span>
          }
          @if (badges().length) {
            <app-account-badges [badges]="badges()" />
          }
        </div>
      </div>
      <div class="aph__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .aph__crumbs {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 11.5px;
        color: var(--txt3);
      }
      .aph__back {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--txt2);
        font-weight: 600;
        text-decoration: none;

        i {
          font-size: 10px;
        }
        &:hover {
          color: var(--brand);
        }
      }
      .aph {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        padding: 20px 22px;
        border-radius: 18px;
        background: var(--bg2);
        border: 1px solid var(--brd);
        box-shadow: 0 1px 2px rgba(10, 42, 74, 0.04);

        &--muted .aph__avatar {
          filter: grayscale(1);
          opacity: 0.6;
        }
      }
      .aph__avatar {
        flex-shrink: 0;
        width: 64px;
        height: 64px;
        border-radius: 16px;
        overflow: hidden;
        background: var(--bl-l);
        color: var(--bl);
        font-size: 24px;
      }
      .aph__text {
        flex: 1;
        min-width: 200px;
      }
      .aph__title {
        margin: 0 0 6px;
        font-size: 19px;
        font-weight: 800;
        color: var(--txt);
      }
      .aph__meta {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .aph__subtitle {
        font-size: 11.5px;
        color: var(--txt2);
      }
      .aph__actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .aph__actions:empty {
        display: none;
      }
      @media (max-width: 640px) {
        .aph {
          padding: 16px;
        }
        .aph__actions {
          width: 100%;
        }
      }
    `,
  ],
})
export class AccountPageHeaderComponent {
  readonly backLink = input.required<string>();
  readonly backLabel = input.required<string>();
  /** Current page after the back link (e.g. "تعديل"). */
  readonly crumb = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly imageUrl = input<string | null>(null);
  readonly icon = input<string>('fa-user');
  readonly badges = input<readonly AccountBadge[]>([]);
  /** Greys the avatar out — for deleted accounts. */
  readonly muted = input(false);
}
