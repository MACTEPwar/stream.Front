import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, linkedSignal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { UploadService } from '@core/services/upload.service';
import { Button } from '@shared/components/button/button';
import { AVATAR_PRESETS } from './avatar-presets';

export interface AvatarPickerModalData {
  currentUrl: string | null;
  onConfirm: (url: string) => void;
}

/**
 * Модалка выбора аватара (stream.Front#65) — открывается через
 * `ModalService.open(AvatarPickerModal, data)` (кнопка «Поменять» в
 * `ProfileSection`), рендерится `ModalHost`'ом через `ngComponentOutlet`
 * (тот же паттерн, что `LoginModal`/`RegisterModal`) — без `AuthModalShell`
 * (её сплит-лейаут с картинкой персонажа специфичен для auth-форм), только
 * собственная минимальная вёрстка (заголовок + галерея + кнопки).
 *
 * `selectedUrl` — `linkedSignal` от `data().currentUrl` (не `effect`,
 * см. `linked-signal.md` — состояние derived из входа, но должно
 * перезаписываться пользователем): выбор пресета или успешная загрузка
 * файла (`UploadService.upload()`, реальный запрос на сервер уже здесь,
 * чтобы получить `url` для превью) обновляют его локально, ничего не
 * сохраняя на бэке — это делает `data().onConfirm(url)` по кнопке «Выбрать»,
 * `ProfileSection` сам решает, когда реально позвать
 * `ProfileService.updateAvatar()` (по общей кнопке «Сохранить»). «Отмена»/
 * закрытие — просто `ModalService.close()` без вызова колбэка.
 */
@Component({
  selector: 'app-avatar-picker-modal',
  imports: [Button],
  templateUrl: './avatar-picker-modal.html',
  styleUrl: './avatar-picker-modal.scss',
})
export class AvatarPickerModal {
  readonly data = input<AvatarPickerModalData>();

  private readonly uploadService = inject(UploadService);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);

  protected readonly avatarPresets = AVATAR_PRESETS;
  protected readonly selectedUrl = linkedSignal(() => this.data()?.currentUrl ?? null);

  protected onPresetSelect(presetPath: string): void {
    this.selectedUrl.set(presetPath);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadService.upload(file).subscribe({
      next: (result) => this.selectedUrl.set(result.url),
      error: (error: HttpErrorResponse) =>
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Не удалось загрузить файл, попробуйте позже',
          'error',
        ),
    });
  }

  protected onConfirm(): void {
    const url = this.selectedUrl();
    if (url) {
      this.data()?.onConfirm(url);
    }
    this.modalService.close();
  }

  protected onCancel(): void {
    this.modalService.close();
  }
}
