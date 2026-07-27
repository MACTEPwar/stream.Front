import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { AuthMethodsService } from '@core/services/auth-methods.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { DecorativeButton } from '@shared/components/decorative-button/decorative-button';
import { TextField } from '@shared/components/text-field/text-field';

// Совпадает с backend/src/auth/methods/dto/add-local-method.dto.ts
// (MinLength(3)/MinLength(8)) — тот же приём, что MIN_LOGIN_LENGTH/
// MIN_PASSWORD_LENGTH в RegisterModal.
const MIN_LOGIN_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;

export interface AddLocalMethodModalData {
  onAdded: () => void;
}

/**
 * Модалка подключения локального входа (`stream.Front#82`) — открывается
 * через `ModalService.open<AddLocalMethodModalData>(AddLocalMethodModal, {
 * onAdded })` (кнопка «Подключить локальный вход» в блоке «Способы входа»
 * `ProfileSection`), тот же структурный паттерн, что `AddGameAccountModal`
 * (immediate-save, без `AuthModalShell`).
 *
 * Успех — `POST /auth/methods/local` (`AuthMethodsService.addLocal()`),
 * затем `data().onAdded()` (вызывающий код сам решает, как обновить
 * `authMethods` — перезапросом `AuthService.fetchCurrentUser()`) и
 * `modalService.close()`. `409` (логин занят) — toast, модалка остаётся
 * открытой (тот же приём, что ошибки в `AddGameAccountModal`).
 */
@Component({
  selector: 'app-add-local-method-modal',
  imports: [TextField, DecorativeButton],
  templateUrl: './add-local-method-modal.html',
  styleUrl: './add-local-method-modal.scss',
})
export class AddLocalMethodModal {
  readonly data = input<AddLocalMethodModalData>();

  private readonly authMethodsService = inject(AuthMethodsService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly login = signal('');
  protected readonly password = signal('');

  protected onSubmit(): void {
    const login = this.login().trim();
    if (login.length < MIN_LOGIN_LENGTH) {
      this.notificationService.show(
        `Логин должен быть не короче ${MIN_LOGIN_LENGTH} символов`,
        'error',
      );
      return;
    }
    if (this.password().length < MIN_PASSWORD_LENGTH) {
      this.notificationService.show(
        `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
        'error',
      );
      return;
    }

    this.authMethodsService.addLocal(login, this.password()).subscribe({
      next: () => {
        this.data()?.onAdded();
        this.modalService.close();
      },
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

  protected onCancel(): void {
    this.modalService.close();
  }
}
