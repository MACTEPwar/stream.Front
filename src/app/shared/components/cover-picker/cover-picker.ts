import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { ImageUrlService } from '@core/services/image-url.service';
import { NotificationService } from '@core/services/notification.service';
import { UploadService } from '@core/services/upload.service';
import { Button } from '../button/button';
import { TextField } from '../text-field/text-field';

let nextInstanceId = 0;

export type CoverPickerType = 'none' | 'image' | 'custom';

/** То, что нужно `CoverPicker`, чтобы отрисовать выбор, и что он отдаёт наружу — зеркало `NewsCoverInput` (`features/admin/models/news.model.ts`), но без завязки на модель конкретной фичи: переиспользуемый `shared`-компонент своей модели фичи не знает. */
export interface CoverPickerValue {
  readonly type: CoverPickerType;
  readonly url: string | null;
}

/**
 * Взаимоисключающий выбор состояния обложки новости из трёх (`ОБЛ-Ф-01`,
 * `stream.Front#132`): «нет обложки» / «одно из изображений» (сам набор
 * миниатюр, не список имён файлов — `ОБЛ-Ф-02`) / «своя» (файл или ссылка —
 * два способа загрузки ОДНОГО и того же состояния, не два разных состояния,
 * `ОБЛ-О-02`). Вариант «одно из изображений» скрыт целиком, когда у новости
 * нет ни одной картинки — выбирать не из чего (`ОБЛ-Ф-03`).
 *
 * Полностью управляемый компонент (тот же приём, что `FocalPointPicker`):
 * `value`/`valueChange`, без внутреннего "черновика" и без `model()` —
 * родитель решает, применять ли выбор сразу (см. `PinnedGridEditor`,
 * `ОБЛ`/`РЕД-О-02`: смена обложки в редакторе витрины меняет новость везде и
 * потому копится не в форме, а в отдельном сигнале-оверлее) или копить его в
 * форме до общего «Сохранить» (`AdminNewsPage`). Каждая инстанция получает
 * свой `radioGroupName` (инкрементный счётчик модуля) — тот же класс бага,
 * что с задублированными `id` в SVG-компонентах одной страницы
 * (`project_svg_duplicate_id_across_instances`): без namespace второй
 * экземпляр на одной странице делил бы `name` радиогруппы с первым.
 */
@Component({
  selector: 'app-cover-picker',
  imports: [Button, TextField],
  templateUrl: './cover-picker.html',
  styleUrl: './cover-picker.scss',
})
export class CoverPicker {
  private readonly uploadService = inject(UploadService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly notificationService = inject(NotificationService);

  protected readonly radioGroupName = `cover-picker-${nextInstanceId++}`;

  /** Набор изображений новости (уже разрешённые `url`, не абсолютные — резолвятся здесь же через `previewUrl()`) — источник варианта «одно из изображений». */
  readonly imageUrls = input<string[]>([]);
  readonly value = input.required<CoverPickerValue>();
  readonly valueChange = output<CoverPickerValue>();

  protected readonly linkInput = signal('');
  protected readonly isUploading = signal(false);

  protected readonly hasImages = computed(() => this.imageUrls().length > 0);

  protected previewUrl(url: string): string {
    return this.imageUrlService.resolve(url);
  }

  protected isImageSelected(url: string): boolean {
    const value = this.value();
    return value.type === 'image' && value.url === url;
  }

  protected customPreviewUrl(): string | null {
    const value = this.value();
    return value.type === 'custom' && value.url ? this.previewUrl(value.url) : null;
  }

  protected onTypeSelect(type: CoverPickerType): void {
    if (type === this.value().type) {
      return;
    }
    if (type === 'none') {
      this.valueChange.emit({ type: 'none', url: null });
      return;
    }
    // Переключение на «одно из изображений»/«своя» намеренно НЕ подставляет
    // предыдущий выбор того же типа — набор изображений или файл могли уже
    // не относиться к текущему состоянию (та же логика, что раньше сбрасывала
    // `draftCoverImageUrl` при смене новости в редакторе). Явный клик по
    // миниатюре/загрузка — обязательны.
    this.valueChange.emit({ type, url: null });
  }

  protected onImageSelect(url: string): void {
    this.valueChange.emit({ type: 'image', url });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }

    this.isUploading.set(true);
    this.uploadService.upload(file).subscribe({
      next: (result) => {
        this.isUploading.set(false);
        this.valueChange.emit({ type: 'custom', url: result.url });
      },
      error: (error: HttpErrorResponse) => {
        this.isUploading.set(false);
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Не удалось загрузить файл, попробуйте позже',
          'error',
        );
      },
    });
  }

  protected onAddLinkClick(): void {
    const raw = this.linkInput().trim();
    if (!raw) {
      return;
    }
    if (!this.isValidUrl(raw)) {
      this.notificationService.show('Некорректная ссылка на изображение', 'error');
      return;
    }
    this.linkInput.set('');
    this.valueChange.emit({ type: 'custom', url: raw });
  }

  private isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
}
