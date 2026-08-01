import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Badge } from '@shared/components/badge/badge';
import { Button } from '@shared/components/button/button';
import { ButtonGroup } from '@shared/components/button-group/button-group';
import { ConfirmModal } from '@shared/components/confirm-modal/confirm-modal';
import { Datepicker } from '@shared/components/datepicker/datepicker';
import { ErrorMessage } from '@shared/components/error-message/error-message';
import { MultiImagePicker } from '@shared/components/multi-image-picker/multi-image-picker';
import { Select } from '@shared/components/select/select';
import { TextField } from '@shared/components/text-field/text-field';
import { AdminNews, AdminNewsTag } from '../../models/news.model';
import { AdminNewsService } from '../../services/admin-news.service';
import { AdminNewsTagService } from '../../services/admin-news-tag.service';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

interface TagFilterOption {
  label: string;
  value: string | null;
}

/**
 * Справочник «Новости» в админ-панели (`stream.Front#115`, доработано поверх
 * `streamer.API#67`) — заменил форму-без-списка первой итерации `#115` на тот
 * же CRUD-паттерн, что `AdminUsersPage`/`AdminNewsTagsPage`: `p-table` в
 * lazy-режиме серверной пагинации (`GET /news`, `AdminNewsService.getAll()`),
 * одна `p-drawer`-форма для СОЗДАНИЯ и РЕДАКТИРОВАНИЯ (`editingNewsId() ===
 * null` отличает режим, тот же приём, что `AdminNewsTagsPage`), удаление —
 * `ConfirmModal`.
 *
 * **Фильтры** — текстовый поиск (`search`, дебаунс {@link SEARCH_DEBOUNCE_MS}мс
 * через `effect()` на `searchFilter`, вручную `setTimeout`/`clearTimeout` —
 * первый запуск эффекта игнорируется через `isFirstSearchRun`, чтобы не
 * задваивать начальную загрузку: она сама уже приходит от `p-table`
 * — `[lazy]="true"` эмитит собственный первый `onLazyLoad` при инициализации,
 * тот же приём, что `AdminUsersPage`, отдельный явный вызов `loadPage(1)` в
 * конструкторе не нужен) и выбор ОДНОГО тега (`tagId`, `Select`,
 * `(valueChange)` применяется сразу — бэк принимает только единственный
 * `tagId`, не массив).
 *
 * **Дата публикации без времени** — то же ограничение `Datepicker`, что было
 * в форме создания первой итерации, см. историю в git.
 *
 * **Чекбоксы тегов в мультиселекте** — нативный `p-checkbox` PrimeNG внутри
 * `.p-multiselect-option` скрыт (`display: none`, см. `admin-news-page.scss`)
 * и заменён собственным индикатором в `#item`-шаблоне (`.admin-news-page__
 * tag-checkbox`), окрашенным цветом тега — тем же визуальным приёмом, что
 * `.checkbox--custom-color` у переиспользуемого `Checkbox`
 * (`shared/components/checkbox/checkbox.scss`: контур цвета тега в состоянии
 * покоя, сплошная заливка тем же цветом когда отмечен). Состояние "отмечен"
 * берётся не из PrimeNG (у `#item`-шаблона в контексте нет `selected`), а из
 * собственного сигнала `selectedTagIds` (`isTagSelected()`) — клик по строке
 * по-прежнему обрабатывает сам PrimeNG (`(click)` висит на всём `<li>`, не на
 * скрытом чекбоксе), визуальный индикатор только отражает состояние.
 *
 * **"Выбрать все" в шапке панели** — управляется вручную через `[selectAll]`/
 * `(onSelectAllChange)` (официально поддерживаемый в PrimeNG режим ручного
 * управления — `selectAll() != null` в `onToggleAll()` делегирует всю логику
 * потребителю, не трогая модель сам), а не встроенным авто-режимом: при
 * снятии галочки встроенная логика не очищала `selectedTagIds` (воспроизведено
 * вручную — теги оставались выбранными после снятия "выбрать все"), поэтому
 * обе стороны (`isAllTagsSelected()`/`onTagSelectAllChange()`) считаются
 * напрямую по `tags()`/`selectedTagIds()`.
 *
 * **Изображения при редактировании** — `news.images` (`AdminNewsImage[]`)
 * сортируются по `order` и мапятся в голый список `url` (тот же формат,
 * что `CreateNewsPayload.imageUrls` — уже загруженные `/uploads/*`-пути или
 * внешние ссылки); `MultiImagePicker` сам резолвит превью через
 * `ImageUrlService.resolve()` (см. `multi-image-picker.ts`) — на уровне этой
 * страницы урлы не резолвятся повторно, иначе на backend улетел бы уже
 * абсолютный (склеенный с `apiUrl`) путь вместо исходного относительного.
 *
 * Успех создания/редактирования — toast + закрытие drawer'а + перезагрузка
 * ТЕКУЩЕЙ страницы таблицы (не локальный патч строки — список сортируется/
 * фильтруется на backend, локальная замена не гарантировала бы то же место
 * в списке после смены даты/тегов).
 */
@Component({
  selector: 'app-admin-news-page',
  imports: [
    FormsModule,
    TableModule,
    DrawerModule,
    MultiSelectModule,
    Badge,
    Button,
    ButtonGroup,
    Datepicker,
    ErrorMessage,
    MultiImagePicker,
    Select,
    TextField,
    DatePipe,
  ],
  templateUrl: './admin-news-page.html',
  styleUrl: './admin-news-page.scss',
})
export class AdminNewsPage {
  private readonly adminNewsService = inject(AdminNewsService);
  private readonly adminNewsTagService = inject(AdminNewsTagService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly news = signal<AdminNews[]>([]);
  protected readonly totalRecords = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = PAGE_SIZE;

  protected readonly tags = signal<AdminNewsTag[]>([]);
  protected readonly isLoadingTags = signal(true);
  protected readonly hasTagsError = signal(false);

  protected readonly searchFilter = signal('');
  protected readonly tagFilter = signal<string | null>(null);

  protected readonly drawerVisible = signal(false);
  protected readonly editingNewsId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly publishedAt = signal<Date | null>(new Date());
  protected readonly selectedTagIds = signal<string[]>([]);
  protected readonly imageUrls = signal<string[]>([]);
  protected readonly isSaving = signal(false);

  private isFirstSearchRun = true;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.loadTags();
    // Начальная страница новостей грузится не явным вызовом здесь, а
    // автоматическим первым `onLazyLoad` события у `p-table` (`[lazy]="true"`
    // сам эмитит его при инициализации, `first: 0, rows: pageSize`) — тот же
    // приём, что уже используется в `AdminUsersPage`.
    effect(() => {
      this.searchFilter();
      if (this.isFirstSearchRun) {
        this.isFirstSearchRun = false;
        return;
      }
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => this.loadPage(1), SEARCH_DEBOUNCE_MS);
    });
  }

  protected isTagSelected(tagId: string): boolean {
    return this.selectedTagIds().includes(tagId);
  }

  protected isAllTagsSelected(): boolean {
    const tags = this.tags();
    return tags.length > 0 && tags.every((tag) => this.selectedTagIds().includes(tag.id));
  }

  protected onTagSelectAllChange(event: { checked: boolean }): void {
    this.selectedTagIds.set(event.checked ? this.tags().map((tag) => tag.id) : []);
  }

  protected tagFilterOptions(): TagFilterOption[] {
    return [{ label: 'Все теги', value: null }, ...this.tags().map((tag) => ({ label: tag.name, value: tag.id }))];
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? PAGE_SIZE;
    const page = Math.floor(first / rows) + 1;
    this.loadPage(page);
  }

  protected onTagFilterChange(): void {
    this.loadPage(1);
  }

  protected onAddClick(): void {
    this.editingNewsId.set(null);
    this.title.set('');
    this.description.set('');
    this.publishedAt.set(new Date());
    this.selectedTagIds.set([]);
    this.imageUrls.set([]);
    this.drawerVisible.set(true);
  }

  protected onEditClick(item: AdminNews): void {
    this.editingNewsId.set(item.id);
    this.title.set(item.title);
    this.description.set(item.description);
    this.publishedAt.set(new Date(item.publishedAt));
    this.selectedTagIds.set(item.tags.map((tag) => tag.id));
    this.imageUrls.set(
      item.images
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((image) => image.url),
    );
    this.drawerVisible.set(true);
  }

  protected onDescriptionInput(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  protected onSaveClick(): void {
    const title = this.title().trim();
    const description = this.description().trim();
    if (!title || !description) {
      this.notificationService.show('Заполните заголовок и описание', 'error');
      return;
    }

    const publishedAt = this.publishedAt();
    const payload = {
      title,
      description,
      imageUrls: this.imageUrls(),
      tagIds: this.selectedTagIds(),
      publishedAt: publishedAt instanceof Date ? publishedAt.toISOString() : undefined,
    };

    const id = this.editingNewsId();
    this.isSaving.set(true);
    const request = id ? this.adminNewsService.update(id, payload) : this.adminNewsService.create(payload);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.drawerVisible.set(false);
        this.notificationService.show(id ? 'Новость обновлена' : 'Новость создана', 'success');
        this.loadPage(this.page());
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Не удалось сохранить новость',
          'error',
        );
      },
    });
  }

  protected onDeleteClick(item: AdminNews): void {
    this.modalService.open(ConfirmModal, {
      message: `Удалить новость «${item.title}»?`,
      confirmText: 'Удалить',
      onConfirm: () => {
        this.adminNewsService.remove(item.id).subscribe({
          next: () => this.loadPage(this.page()),
          error: (error: HttpErrorResponse) =>
            this.notificationService.show(
              extractApiErrorMessage(error) ?? 'Не удалось удалить новость',
              'error',
            ),
        });
      },
    });
  }

  private loadPage(page: number): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    const filter = {
      search: this.searchFilter().trim() || undefined,
      tagId: this.tagFilter() ?? undefined,
    };
    this.adminNewsService.getAll(page, PAGE_SIZE, filter).subscribe({
      next: (response) => {
        this.news.set(response.items);
        this.totalRecords.set(response.meta.total);
        this.page.set(response.meta.page);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private loadTags(): void {
    this.isLoadingTags.set(true);
    this.hasTagsError.set(false);
    this.adminNewsTagService.getAll().subscribe({
      next: (tags) => {
        this.tags.set(tags);
        this.isLoadingTags.set(false);
      },
      error: () => {
        this.hasTagsError.set(true);
        this.isLoadingTags.set(false);
      },
    });
  }
}
