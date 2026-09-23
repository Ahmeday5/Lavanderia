import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { DialogService } from '../../../core/services/dialog.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);
  protected readonly layout = inject(LayoutService);
  protected readonly dialog = inject(DialogService);

  protected readonly appName = environment.appName;
  protected readonly currentUser = this.authService.currentUser;
  protected readonly today = new Date().toLocaleDateString('ar-LY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  logout(): void {
    this.dialog
      .confirm({
        title: 'تسجيل الخروج',
        message: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
        type: 'warning',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.authService.logout();
          this.layout.closeMobile();
        }
      });
  }
}
