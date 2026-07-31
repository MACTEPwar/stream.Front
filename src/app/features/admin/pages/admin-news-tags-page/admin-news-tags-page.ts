import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { TableModule } from 'primeng/table';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { ConfirmModal } from '@shared/components/confirm-modal/confirm-modal';
import { ErrorMessage } from '@shared/components/error-message/error-message';
import { TextField } from '@shared/components/text-field/text-field';
import { AdminNewsTag } from '../../models/news.model';
import { AdminNewsTagService } from '../../services/admin-news-tag.service';

/**
 * Справочник «Теги» в админ-панели (`stream.Front#115`, поверх
 * `streamer.API#65`) — тот же CRUD-паттерн, что `AdminUsersPage`/
 * `AdminSchedulePage`: `p-table` (без серверной пагинации — теги не
 * пагинируются на backend, `GET /news-tags` отдаёт весь список сразу),
 * `p-drawer` с формой `name`/`color`/`textColor` для создания И редактирования
 * (одна форма, `editingTagId() === null` отличает режим), удаление — через
 * `ConfirmModal` (тот же паттерн, что `AdminUsersPage.onDeleteClick()`).
 * `color`/`textColor` — обычный `TextField` (`#RRGGBB`, как в примере backend
 * DTO) + нативный `<input type="color">` рядом для визуального подбора,
 * каждый биндится на свой собственный signal тем же приёмом.
 *
 * **Поиск по названию (`stream.Front#115`, доработка)** — `searchFilter`
 * signal + `computed()` (`filteredTags`) фильтрует уже загруженный ПОЛНЫЙ
 * список НА ФРОНТЕ (регистронезависимая подстрока по `name`), без похода на
 * backend: `GET /news-tags` (публичный, единственный источник тегов) не
 * поддерживает `search` — теги не растут в объёме настолько, чтобы грузить
 * их постранично/с фильтром на сервере, добавлять query-параметр под это
 * было бы преждевременной оптимизацией. `p-table` рендерит `filteredTags()`
 * вместо `tags()`.
 */
@Component({
  selector: 'app-admin-news-tags-page',
  imports: [TableModule, DrawerModule, Button, TextField, ErrorMessage],
  templateUrl: './admin-news-tags-page.html',
  styleUrl: './admin-news-tags-page.scss',
})
export class AdminNewsTagsPage {
  private readonly adminNewsTagService = inject(AdminNewsTagService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly tags = signal<AdminNewsTag[]>([]);

  protected readonly searchFilter = signal('');
  protected readonly filteredTags = computed(() => {
    const query = this.searchFilter().trim().toLowerCase();
    if (!query) {
      return this.tags();
    }
    return this.tags().filter((tag) => tag.name.toLowerCase().includes(query));
  });

  protected readonly drawerVisible = signal(false);
  protected readonly editingTagId = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly color = signal('#FF5733');
  protected readonly textColor = signal('#FFFFFF');
  protected readonly isSaving = signal(false);

  constructor() {
    this.loadTags();
  }

  protected onAddClick(): void {
    this.editingTagId.set(null);
    this.name.set('');
    this.color.set('#FF5733');
    this.textColor.set('#FFFFFF');
    this.drawerVisible.set(true);
  }

  protected onEditClick(tag: AdminNewsTag): void {
    this.editingTagId.set(tag.id);
    this.name.set(tag.name);
    this.color.set(tag.color);
    this.textColor.set(tag.textColor);
    this.drawerVisible.set(true);
  }

  protected onSaveClick(): void {
    const name = this.name().trim();
    const color = this.color().trim();
    const textColor = this.textColor().trim();
    if (!name || !color || !textColor) {
      this.notificationService.show('Заполните название, цвет фона и цвет текста', 'error');
      return;
    }

    const id = this.editingTagId();
    this.isSaving.set(true);
    const request = id
      ? this.adminNewsTagService.update(id, { name, color, textColor })
      : this.adminNewsTagService.create({ name, color, textColor });

    request.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.drawerVisible.set(false);
        if (id) {
          this.tags.update((tags) => tags.map((tag) => (tag.id === id ? saved : tag)));
        } else {
          this.tags.update((tags) => [...tags, saved]);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Не удалось сохранить тег',
          'error',
        );
      },
    });
  }

  protected onDeleteClick(tag: AdminNewsTag): void {
    this.modalService.open(ConfirmModal, {
      message: `Удалить тег «${tag.name}»?`,
      confirmText: 'Удалить',
      onConfirm: () => {
        this.adminNewsTagService.remove(tag.id).subscribe({
          next: () => this.tags.update((tags) => tags.filter((item) => item.id !== tag.id)),
          error: (error: HttpErrorResponse) =>
            this.notificationService.show(
              extractApiErrorMessage(error) ?? 'Не удалось удалить тег',
              'error',
            ),
        });
      },
    });
  }

  private loadTags(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.adminNewsTagService.getAll().subscribe({
      next: (tags) => {
        this.tags.set(tags);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
