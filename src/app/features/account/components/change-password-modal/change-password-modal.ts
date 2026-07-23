import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { TextField } from '@shared/components/text-field/text-field';

// Совпадает с MinLength в backend/src/auth/dto/change-password.dto.ts — тот же
// приём, что и MIN_PASSWORD_LENGTH в RegisterModal (см. её комментарий).
const MIN_PASSWORD_LENGTH = 8;

/**
 * Модалка смены пароля (stream.Front#65) — открывается через
 * `ModalService.open(ChangePasswordModal)` (кнопка «Сменить пароль» в
 * `ProfileSection`), тот же паттерн, что `LoginModal`/`RegisterModal`
 * (`@Component` + `data = input<unknown>()`, заведён вхолостую — модалке
 * чужие данные не нужны, нужен только чтобы `ngComponentOutletInputs` не
 * ругался), без `AuthModalShell`.
 *
 * В отличие от имени/аватара в `ProfileSection` (локальный "черновик" до
 * общей кнопки «Сохранить») — сохраняется СРАЗУ по кнопке внутри самой
 * модалки, независимый immediate-save flow. `401` (неверный текущий пароль)
 * — toast, модалка остаётся открытой (даём попробовать снова, `close()` не
 * вызывается), прочие ошибки — `extractApiErrorMessage` с фолбэком, тот же
 * приём, что и в `LoginModal`.
 */
@Component({
  selector: 'app-change-password-modal',
  imports: [TextField, Button],
  templateUrl: './change-password-modal.html',
  styleUrl: './change-password-modal.scss',
})
export class ChangePasswordModal {
  readonly data = input<unknown>();

  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');

  protected onSubmit(): void {
    if (this.currentPassword().length === 0 || this.newPassword().length === 0) {
      this.notificationService.show('Заполните текущий и новый пароль', 'error');
      return;
    }
    if (this.newPassword().length < MIN_PASSWORD_LENGTH) {
      this.notificationService.show(
        `Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
        'error',
      );
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.notificationService.show('Пароли не совпадают', 'error');
      return;
    }

    this.authService
      .changePassword({ currentPassword: this.currentPassword(), newPassword: this.newPassword() })
      .subscribe({
        next: () => {
          this.notificationService.show('Пароль обновлён', 'success');
          this.modalService.close();
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.notificationService.show('Неверный текущий пароль', 'error');
            return;
          }
          this.notificationService.show(
            extractApiErrorMessage(error) ?? 'Что-то пошло не так, попробуйте позже',
            'error',
          );
        },
      });
  }

  protected onCancel(): void {
    this.modalService.close();
  }
}
