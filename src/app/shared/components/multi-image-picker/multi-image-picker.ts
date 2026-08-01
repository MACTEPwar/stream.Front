import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, model, signal } from '@angular/core';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { ImageUrlService } from '@core/services/image-url.service';
import { NotificationService } from '@core/services/notification.service';
import { UploadService } from '@core/services/upload.service';
import { Button } from '@shared/components/button/button';
import { TextField } from '@shared/components/text-field/text-field';

/**
 * Множественный выбор изображений (`stream.Front#115`, `AdminNewsPage`) —
 * два способа добавления, каждый сразу добавляет в общий список `urls`
 * (`model<string[]>`, порядок = порядок добавления, без `ReactiveFormsModule`,
 * тот же паттерн, что `TextField`/`Select`): (а) выбор файла(ов) —
 * `UploadService.upload()` для каждого файла сразу по выбору, в список идёт
 * `result.url` (`/uploads/*`); (б) текстовое поле + кнопка «Добавить по
 * ссылке» — валидация только `new URL()` (похоже на ссылку), без запроса к
 * ней, добавляется как есть. Превью — всегда `ImageUrlService.resolve()`
 * (тот же метод для обоих источников: `/uploads/*` резолвится в абсолютный
 * URL backend, уже абсолютные `http(s)`-ссылки возвращаются как есть — метод
 * сам различает эти случаи, вызывающему коду различать источник не нужно).
 * Удаление — по индексу (не по значению URL — одна и та же ссылка технически
 * может быть добавлена дважды).
 */
@Component({
  selector: 'app-multi-image-picker',
  imports: [Button, TextField],
  templateUrl: './multi-image-picker.html',
  styleUrl: './multi-image-picker.scss',
})
export class MultiImagePicker {
  private readonly uploadService = inject(UploadService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly notificationService = inject(NotificationService);

  readonly urls = model<string[]>([]);

  protected readonly linkInput = signal('');
  protected readonly isUploading = signal(false);

  protected previewUrl(url: string): string {
    return this.imageUrlService.resolve(url);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (files.length === 0) return;

    this.isUploading.set(true);
    files.forEach((file) => {
      this.uploadService.upload(file).subscribe({
        next: (result) => {
          this.urls.update((urls) => [...urls, result.url]);
          this.isUploading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.isUploading.set(false);
          this.notificationService.show(
            extractApiErrorMessage(error) ?? 'Не удалось загрузить файл, попробуйте позже',
            'error',
          );
        },
      });
    });
  }

  protected onAddLinkClick(): void {
    const raw = this.linkInput().trim();
    if (!raw) return;

    if (!this.isValidUrl(raw)) {
      this.notificationService.show('Некорректная ссылка на изображение', 'error');
      return;
    }

    this.urls.update((urls) => [...urls, raw]);
    this.linkInput.set('');
  }

  protected onRemoveClick(index: number): void {
    this.urls.update((urls) => urls.filter((_, i) => i !== index));
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
