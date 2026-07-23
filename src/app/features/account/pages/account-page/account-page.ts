import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { Button } from '@shared/components/button/button';
import { SectionTitle } from '@shared/components/section-title/section-title';

/**
 * Личный кабинет (stream.Front#64) — layout-контейнер с тремя
 * секциями-заглушками под будущие задачи: профиль (#65), игровые аккаунты
 * (#66), соц. сети (#67). Реальное содержимое секций не входит в #64 —
 * только заголовок (`SectionTitle`) и текст-плейсхолдер.
 *
 * Кнопка «Выйти» — действие уровня страницы (не относится ни к одной из
 * трёх секций), поэтому вынесена отдельно под все секции, в самый низ
 * layout'а (по прямому запросу пользователя), прижата к левому краю.
 * `AuthService.logout()` уже сбрасывает `currentUser` в `null` через
 * `finalize()` (`stream.Front#4`) — `Shell` реактивно переключится обратно
 * в гостевое состояние сам, без дополнительного кода здесь. После успешного
 * выхода — явный редирект на `/main`: оставаться на защищённой `authGuard`
 * странице незачем (guard всё равно отправил бы сюда при следующей
 * навигации, но явный редирект сразу — лучше, чем полагаться на этот
 * побочный эффект).
 */
@Component({
  selector: 'app-account-page',
  imports: [SectionTitle, Button],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected onLogoutClick(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/main']));
  }
}
