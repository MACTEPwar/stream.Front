import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthModalShell } from '@shared/components/auth-modal-shell/auth-modal-shell';
import { Button } from '@shared/components/button/button';
import { TextField } from '@shared/components/text-field/text-field';
import { LoginModal } from '../login-modal/login-modal';

// Совпадает с MinLength в backend/src/auth/dto/register.dto.ts — без этого
// клиент бил в API с заведомо невалидным паролем/логином и узнавал об этом
// только из ответа сервера.
const MIN_LOGIN_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Модалка регистрации (stream.Front#59) — тот же приём, что и `LoginModal`
 * (см. её комментарий): открывается через `ModalService.open(RegisterModal)`,
 * footer-ссылка "Уже есть аккаунт?" переоткрывает `LoginModal`.
 * Ошибки (пустые поля, длина логина/пароля меньше минимума из `RegisterDto`,
 * несовпадение паролей, 409 от бэкенда, прочие 400 от `ValidationPipe` —
 * `message` там может быть массивом сразу нескольких проваленных правил,
 * см. `extractApiErrorMessage`) — через `NotificationService.show(...)`
 * (toast), не инлайн в форме — инлайн-показ уберём/переделаем, когда придёт
 * макет с примером error-состояния (по прямому запросу пользователя).
 */
@Component({
  selector: 'app-register-modal',
  imports: [AuthModalShell, TextField, Button],
  templateUrl: './register-modal.html',
  styleUrl: './register-modal.scss',
})
export class RegisterModal {
  readonly data = input<unknown>();

  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly login = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');

  protected readonly canSubmit = computed(
    () =>
      this.login().trim().length >= MIN_LOGIN_LENGTH &&
      this.password().length >= MIN_PASSWORD_LENGTH &&
      this.confirmPassword() === this.password(),
  );

  protected onSubmit(): void {
    if (!this.canSubmit()) {
      this.notificationService.show(this.firstValidationError(), 'error');
      return;
    }

    this.authService.register(this.login(), this.password()).subscribe({
      next: () => this.modalService.close(),
      error: (error: HttpErrorResponse) => {
        if (error.status === 409) {
          this.notificationService.show('Такой логин уже занят', 'error');
          return;
        }
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Что-то пошло не так, попробуйте позже',
          'error',
        );
      },
    });
  }

  private firstValidationError(): string {
    if (this.login().trim().length < MIN_LOGIN_LENGTH || this.password().length === 0) {
      return 'Заполните логин и пароль';
    }
    if (this.password().length < MIN_PASSWORD_LENGTH) {
      return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
    }
    return 'Пароли не совпадают';
  }

  protected onGoogleClick(): void {
    this.notificationService.show('Регистрация через Google пока не реализована', 'info');
  }

  protected onFacebookClick(): void {
    this.notificationService.show('Регистрация через Facebook пока не реализована', 'info');
  }

  protected onLoginLinkClick(): void {
    this.modalService.open(LoginModal);
  }
}
