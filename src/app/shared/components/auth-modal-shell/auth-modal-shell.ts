import { Component, input, output } from '@angular/core';

/**
 * Общий презентационный каркас модалок входа/регистрации (stream.Front#58/#59)
 * — картинка персонажа слева (`public/images/login_bg.png`, split-layout по
 * макету), заголовок и футер-ссылка ("Уже есть аккаунт? Вход" / "Нет
 * аккаунта? Регистрация") — справа, форма самих полей приходит через
 * `<ng-content>` от `LoginModal`/`RegisterModal`. Без собственного состояния —
 * переключение между модалками делает вызывающий компонент
 * (`modalService.open(...)` на `footerLinkClick`).
 */
@Component({
  selector: 'app-auth-modal-shell',
  imports: [],
  templateUrl: './auth-modal-shell.html',
  styleUrl: './auth-modal-shell.scss',
})
export class AuthModalShell {
  readonly title = input.required<string>();
  readonly footerText = input<string>('');
  readonly footerLinkText = input<string>('');

  readonly footerLinkClick = output<void>();
}
