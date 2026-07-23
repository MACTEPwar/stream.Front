import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { SOCIAL_LINK_TYPE_LABELS, SocialLink, SocialLinkType } from '@core/models/social-link.model';
import { SocialLinkService } from '@core/services/social-link.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { ConfirmModal, ConfirmModalData } from '@shared/components/confirm-modal/confirm-modal';
import { ErrorMessage } from '@shared/components/error-message/error-message';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { TextField } from '@shared/components/text-field/text-field';
import { AddSocialLinkModal, AddSocialLinkModalData } from '../add-social-link-modal/add-social-link-modal';

const GENERIC_ERROR_MESSAGE = 'Что-то пошло не так, попробуйте позже';

/**
 * Секция «Соц. сети» личного кабинета (stream.Front#67) — подключается в
 * `AccountPage` (`#64`) вместо секции-заглушки, тот же структурный паттерн,
 * что `GameAccountsSection` (`#66`): `SectionTitle` остаётся в
 * `account-page.html`, этот компонент отвечает только за содержимое.
 *
 * Список грузится один раз в конструкторе, loading/error/empty по конвенции
 * `stream.Front#9`: loading — `Skeleton`×3, error — `ErrorMessage`, empty —
 * собственный текст-заглушка. Каждая карточка списка — `SOCIAL_LINK_TYPE_LABELS[type]: value`
 * в одну строку.
 *
 * Добавление — модалка (`AddSocialLinkModal`, тот же паттерн, что
 * `AddGameAccountModal`): кнопка «Добавить» внизу списка открывает
 * `ModalService.open<AddSocialLinkModalData>(AddSocialLinkModal, { onCreated })`,
 * `onCreated` дописывает новую ссылку в локальный список без повторного
 * `getAll()`. Редактирование — инлайн (переключение карточки в режим с
 * `<select>` типа + `TextField` значения, тот же приём, что у
 * `GameAccountsSection`). Удаление — через переиспользуемый `ConfirmModal`.
 */
@Component({
  selector: 'app-social-links-section',
  imports: [TextField, Button, ErrorMessage, Skeleton],
  templateUrl: './social-links-section.html',
  styleUrl: './social-links-section.scss',
})
export class SocialLinksSection {
  private readonly socialLinkService = inject(SocialLinkService);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly links = signal<SocialLink[]>([]);

  protected readonly typeLabels = Object.entries(SOCIAL_LINK_TYPE_LABELS) as [SocialLinkType, string][];

  protected readonly editingId = signal<string | null>(null);
  protected readonly editType = signal<SocialLinkType | ''>('');
  protected readonly editValue = signal('');

  constructor() {
    this.socialLinkService.getAll().subscribe({
      next: (links) => {
        this.links.set(links);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  protected labelFor(link: SocialLink): string {
    return `${SOCIAL_LINK_TYPE_LABELS[link.type]}: ${link.value}`;
  }

  protected onAddClick(): void {
    this.modalService.open<AddSocialLinkModalData>(AddSocialLinkModal, {
      onCreated: (link) => this.links.update((links) => [...links, link]),
    });
  }

  protected onEditStart(link: SocialLink): void {
    this.editingId.set(link.id);
    this.editType.set(link.type);
    this.editValue.set(link.value);
  }

  protected onEditCancel(): void {
    this.editingId.set(null);
  }

  protected onEditTypeChange(rawValue: string): void {
    this.editType.set(rawValue as SocialLinkType | '');
  }

  protected onEditSave(id: string): void {
    const type = this.editType();
    const value = this.editValue().trim();
    if (!type || !value) {
      this.notificationService.show('Выберите тип и заполните значение', 'error');
      return;
    }

    this.socialLinkService.update(id, { type, value }).subscribe({
      next: (updated) => {
        this.links.update((links) => links.map((l) => (l.id === id ? updated : l)));
        this.editingId.set(null);
      },
      error: (error: HttpErrorResponse) => this.showApiError(error),
    });
  }

  protected onDelete(link: SocialLink): void {
    this.modalService.open<ConfirmModalData>(ConfirmModal, {
      message: `Удалить соц. сеть «${this.labelFor(link)}»?`,
      confirmText: 'Удалить',
      onConfirm: () => this.removeLink(link.id),
    });
  }

  private removeLink(id: string): void {
    this.socialLinkService.remove(id).subscribe({
      next: () => this.links.update((links) => links.filter((l) => l.id !== id)),
      error: (error: HttpErrorResponse) => this.showApiError(error),
    });
  }

  private showApiError(error: HttpErrorResponse): void {
    this.notificationService.show(extractApiErrorMessage(error) ?? GENERIC_ERROR_MESSAGE, 'error');
  }
}
