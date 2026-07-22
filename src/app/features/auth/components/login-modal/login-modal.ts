import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthModalShell } from '@shared/components/auth-modal-shell/auth-modal-shell';
import { Button } from '@shared/components/button/button';
import { TextField } from '@shared/components/text-field/text-field';
import { RegisterModal } from '../register-modal/register-modal';

/**
 * Модалка входа (stream.Front#58). Открывается через `ModalService.open(LoginModal)`
 * (кнопка «Войти» в `Shell`, stream.Front#60) — рендерится `ModalHost`'ом через
 * `ngComponentOutlet`. `data` — обязательный input у `ngComponentOutletInputs`
 * (`ModalHost` всегда передаёт его, даже `undefined`), самой модалке не нужен.
 * Переключение на регистрацию — footer-ссылка просто переоткрывает модалку
 * другим компонентом (`ModalHost` пересоздаёт `ngComponentOutlet`), без
 * общего view-state между `LoginModal`/`RegisterModal`. Ошибки (валидация
 * обязательных полей, 401 от бэкенда) — через `NotificationService.show(...)`
 * (toast), не инлайн в форме — инлайн-показ уберём/переделаем, когда придёт
 * макет с примером error-состояния (по прямому запросу пользователя).
 */
@Component({
  selector: 'app-login-modal',
  imports: [AuthModalShell, TextField, Button],
  templateUrl: './login-modal.html',
  styleUrl: './login-modal.scss',
})
export class LoginModal {
  readonly data = input<unknown>();

  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly login = signal('');
  protected readonly password = signal('');

  protected readonly canSubmit = computed(
    () => this.login().trim().length > 0 && this.password().length > 0,
  );

  protected onSubmit(): void {
    if (!this.canSubmit()) {
      this.notificationService.show('Заполните логин и пароль', 'error');
      return;
    }

    this.authService.login(this.login(), this.password()).subscribe({
      next: () => this.modalService.close(),
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.notificationService.show('Неверный логин или пароль', 'error');
          return;
        }
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Что-то пошло не так, попробуйте позже',
          'error',
        );
      },
    });
  }

  protected onGoogleClick(): void {
    this.notificationService.show('Вход через Google пока не реализован', 'info');
  }

  protected onFacebookClick(): void {
    this.notificationService.show('Вход через Facebook пока не реализован', 'info');
  }

  protected onRegisterLinkClick(): void {
    this.modalService.open(RegisterModal);
  }
}
