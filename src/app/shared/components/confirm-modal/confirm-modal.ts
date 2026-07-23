import { Component, inject, input } from '@angular/core';

import { ModalService } from '@core/services/modal.service';
import { Button } from '@shared/components/button/button';

export interface ConfirmModalData {
  message: string;
  onConfirm: () => void;
  confirmText?: string;
}

/**
 * Переиспользуемый диалог подтверждения (stream.Front#66) — открывается через
 * `ModalService.open<ConfirmModalData>(ConfirmModal, { message, onConfirm })`,
 * рендерится `ModalHost`'ом через `ngComponentOutlet` (тот же паттерн, что
 * `AvatarPickerModal`/`ChangePasswordModal`, без `AuthModalShell`). Заведён в
 * `shared/` (не в `features/account/`) — первый потребитель `GameAccountsSection`
 * (удаление игрового аккаунта), пригодится и `stream.Front#67` (удаление
 * соц-сетей).
 *
 * Кнопка подтверждения зовёт `data().onConfirm()`, затем `modalService.close()`
 * — сама модалка не знает, что именно подтверждается (никакого запроса к API
 * здесь нет, это ответственность вызывающего кода). «Отмена»/`Esc`/клик по
 * backdrop — просто `close()` без вызова колбэка, всё уже обрабатывается
 * `ModalHost`, доп. кода не требуется.
 */
@Component({
  selector: 'app-confirm-modal',
  imports: [Button],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
})
export class ConfirmModal {
  readonly data = input<ConfirmModalData>();

  private readonly modalService = inject(ModalService);

  protected onConfirm(): void {
    this.data()?.onConfirm();
    this.modalService.close();
  }

  protected onCancel(): void {
    this.modalService.close();
  }
}
