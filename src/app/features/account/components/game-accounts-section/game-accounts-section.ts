import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { GameAccount } from '@core/models/game-account.model';
import { GameAccountService } from '@core/services/game-account.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { ConfirmModal, ConfirmModalData } from '@shared/components/confirm-modal/confirm-modal';
import { ErrorMessage } from '@shared/components/error-message/error-message';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { TextField } from '@shared/components/text-field/text-field';
import { AddGameAccountModal, AddGameAccountModalData } from '../add-game-account-modal/add-game-account-modal';

const GENERIC_ERROR_MESSAGE = 'Что-то пошло не так, попробуйте позже';

/**
 * Секция «Игровые аккаунты» личного кабинета (stream.Front#66) — подключается
 * в `AccountPage` (`#64`) вместо секции-заглушки, тот же структурный паттерн,
 * что `ProfileSection` (`#65`): `SectionTitle` остаётся в `account-page.html`,
 * этот компонент отвечает только за содержимое.
 *
 * Список грузится один раз в конструкторе (тот же приём, что `ScheduleWidget`/
 * `DonatorsWidget`) — loading/error/empty по конвенции `stream.Front#9`:
 * loading — `Skeleton` (по одному на каждую карточку списка), error —
 * `ErrorMessage`; empty — собственный текст-заглушка (список пуст, но это не
 * ошибка). Каждая карточка списка — `nickname (externalId)` в одну строку.
 *
 * Добавление — не инлайн-форма, а модалка (`AddGameAccountModal`, по прямому
 * запросу пользователя после ревью первой версии): кнопка «Добавить» внизу
 * списка открывает `ModalService.open<AddGameAccountModalData>(AddGameAccountModal, { onCreated })`,
 * `onCreated` дописывает новый аккаунт в локальный список без повторного
 * `getAll()`. Редактирование — инлайн (переключение карточки в режим
 * редактирования, без отдельной модалки — полей всего два), эта часть не
 * менялась. Удаление — через переиспользуемый `ConfirmModal` (`shared/`,
 * заведён этой же задачей, первый потребитель).
 */
@Component({
  selector: 'app-game-accounts-section',
  imports: [TextField, Button, ErrorMessage, Skeleton],
  templateUrl: './game-accounts-section.html',
  styleUrl: './game-accounts-section.scss',
})
export class GameAccountsSection {
  private readonly gameAccountService = inject(GameAccountService);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly accounts = signal<GameAccount[]>([]);

  protected readonly editingId = signal<string | null>(null);
  protected readonly editNickname = signal('');
  protected readonly editExternalId = signal('');

  constructor() {
    this.gameAccountService.getAll().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  protected onAddClick(): void {
    this.modalService.open<AddGameAccountModalData>(AddGameAccountModal, {
      onCreated: (account) => this.accounts.update((accounts) => [...accounts, account]),
    });
  }

  protected onEditStart(account: GameAccount): void {
    this.editingId.set(account.id);
    this.editNickname.set(account.nickname);
    this.editExternalId.set(account.externalId);
  }

  protected onEditCancel(): void {
    this.editingId.set(null);
  }

  protected onEditSave(id: string): void {
    const nickname = this.editNickname().trim();
    const externalId = this.editExternalId().trim();
    if (!nickname || !externalId) {
      this.notificationService.show('Заполните ник и id аккаунта', 'error');
      return;
    }

    this.gameAccountService.update(id, { nickname, externalId }).subscribe({
      next: (updated) => {
        this.accounts.update((accounts) => accounts.map((a) => (a.id === id ? updated : a)));
        this.editingId.set(null);
      },
      error: (error: HttpErrorResponse) => this.showApiError(error),
    });
  }

  protected onDelete(account: GameAccount): void {
    this.modalService.open<ConfirmModalData>(ConfirmModal, {
      message: `Удалить игровой аккаунт «${account.nickname}»?`,
      confirmText: 'Удалить',
      onConfirm: () => this.removeAccount(account.id),
    });
  }

  private removeAccount(id: string): void {
    this.gameAccountService.remove(id).subscribe({
      next: () => this.accounts.update((accounts) => accounts.filter((a) => a.id !== id)),
      error: (error: HttpErrorResponse) => this.showApiError(error),
    });
  }

  private showApiError(error: HttpErrorResponse): void {
    this.notificationService.show(extractApiErrorMessage(error) ?? GENERIC_ERROR_MESSAGE, 'error');
  }
}
