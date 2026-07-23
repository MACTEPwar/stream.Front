import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { GameAccount } from '@core/models/game-account.model';
import { GameAccountService } from '@core/services/game-account.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { TextField } from '@shared/components/text-field/text-field';

export interface AddGameAccountModalData {
  onCreated: (account: GameAccount) => void;
}

/**
 * Модалка добавления игрового аккаунта (stream.Front#66) — открывается через
 * `ModalService.open<AddGameAccountModalData>(AddGameAccountModal, { onCreated })`
 * (кнопка «Добавить» в `GameAccountsSection`), тот же структурный паттерн, что
 * `ChangePasswordModal`/`ConfirmModal` (без `AuthModalShell`).
 *
 * Immediate-save flow (как `ChangePasswordModal`) — сохраняется сразу по
 * кнопке внутри самой модалки, не черновик. Успех — вызывает
 * `data().onCreated(account)` (вызывающий код сам решает, как обновить
 * локальный список), затем `modalService.close()`. Ошибка API — toast
 * (`extractApiErrorMessage`), модалка остаётся открытой (даём исправить и
 * попробовать снова, тот же приём, что 401 в `ChangePasswordModal`).
 */
@Component({
  selector: 'app-add-game-account-modal',
  imports: [TextField, Button],
  templateUrl: './add-game-account-modal.html',
  styleUrl: './add-game-account-modal.scss',
})
export class AddGameAccountModal {
  readonly data = input<AddGameAccountModalData>();

  private readonly gameAccountService = inject(GameAccountService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly nickname = signal('');
  protected readonly externalId = signal('');

  protected onSubmit(): void {
    const nickname = this.nickname().trim();
    const externalId = this.externalId().trim();
    if (!nickname || !externalId) {
      this.notificationService.show('Заполните ник и id аккаунта', 'error');
      return;
    }

    this.gameAccountService.create({ nickname, externalId }).subscribe({
      next: (account) => {
        this.data()?.onCreated(account);
        this.modalService.close();
      },
      error: (error: HttpErrorResponse) =>
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Что-то пошло не так, попробуйте позже',
          'error',
        ),
    });
  }

  protected onCancel(): void {
    this.modalService.close();
  }
}
