import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { SOCIAL_LINK_TYPE_LABELS, SocialLink, SocialLinkType } from '@core/models/social-link.model';
import { SocialLinkService } from '@core/services/social-link.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { TextField } from '@shared/components/text-field/text-field';

export interface AddSocialLinkModalData {
  onCreated: (link: SocialLink) => void;
}

/**
 * Модалка добавления соц-сети (stream.Front#67) — открывается через
 * `ModalService.open<AddSocialLinkModalData>(AddSocialLinkModal, { onCreated })`
 * (кнопка «Добавить» в `SocialLinksSection`), тот же структурный паттерн, что
 * `AddGameAccountModal` (`stream.Front#66`, без `AuthModalShell`).
 *
 * Отличие от `AddGameAccountModal` — вместо второго `TextField` нативный
 * `<select>` с опциями из `SOCIAL_LINK_TYPE_LABELS`, пустой placeholder-опцией
 * (не проходит валидацию), дефолт — пустая строка. Immediate-save flow (как
 * `ChangePasswordModal`/`AddGameAccountModal`) — сохраняется сразу по кнопке
 * внутри самой модалки, не черновик. Успех — вызывает `data().onCreated(link)`
 * (вызывающий код сам решает, как обновить локальный список), затем
 * `modalService.close()`. Ошибка API — toast (`extractApiErrorMessage`),
 * модалка остаётся открытой (даём исправить и попробовать снова).
 */
@Component({
  selector: 'app-add-social-link-modal',
  imports: [TextField, Button],
  templateUrl: './add-social-link-modal.html',
  styleUrl: './add-social-link-modal.scss',
})
export class AddSocialLinkModal {
  readonly data = input<AddSocialLinkModalData>();

  protected readonly typeLabels = Object.entries(SOCIAL_LINK_TYPE_LABELS) as [SocialLinkType, string][];

  private readonly socialLinkService = inject(SocialLinkService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly type = signal<SocialLinkType | ''>('');
  protected readonly value = signal('');

  protected onSubmit(): void {
    const type = this.type();
    const value = this.value().trim();
    if (!type || !value) {
      this.notificationService.show('Выберите тип и заполните значение', 'error');
      return;
    }

    this.socialLinkService.create({ type, value }).subscribe({
      next: (link) => {
        this.data()?.onCreated(link);
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

  protected onTypeChange(rawValue: string): void {
    this.type.set(rawValue as SocialLinkType | '');
  }
}
