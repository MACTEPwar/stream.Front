import { Component, DestroyRef, ElementRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';

import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { ConfirmModal, ConfirmModalData } from '@shared/components/confirm-modal/confirm-modal';
import { Select } from '@shared/components/select/select';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import {
  CardImagePosition,
  DEFAULT_CARD_STYLE,
  PinnedGridConfig,
  PinnedGridLayout,
  PinnedGridViewport,
  PinnedNewsCardStyle,
  PinnedNewsSlot,
  computeGridResizeImpact,
  isSlotPlacementValid,
} from '../../models/pinned-news-slot.model';
import { NewsCard } from '../news-card/news-card';

/** Тот же зазор между ячейками, что у `PinnedNewsGrid` (`pinned-news-grid.scss`) — нужен и в TS для пересчёта пикселей курсора в ячейки. */
const GRID_GAP_PX = 20;

type DragKind = 'move' | 'col' | 'row';

interface DragState {
  readonly newsId: string;
  readonly kind: DragKind;
  readonly startX: number;
  readonly startY: number;
  readonly startSlot: PinnedNewsSlot;
  readonly preview: PinnedNewsSlot;
  readonly valid: boolean;
}

interface GridCell {
  readonly col: number;
  readonly row: number;
}

interface PlacementDrag {
  readonly startCol: number;
  readonly startRow: number;
  readonly col: number;
  readonly row: number;
}

interface PendingNews {
  readonly newsId: string;
  readonly coverImageUrl: string | null;
}

type DraftStyleNumberField = 'imageSizePercent' | 'imageScale' | 'imageOffsetX' | 'imageOffsetY';
type DraftStyleColorField = 'backgroundColor' | 'textColor';

const IMAGE_POSITION_OPTIONS: { label: string; value: CardImagePosition }[] = [
  { label: 'Сверху', value: 'top' },
  { label: 'Справа', value: 'right' },
  { label: 'Снизу', value: 'bottom' },
  { label: 'Слева', value: 'left' },
];

interface ViewportPresetSize {
  readonly width: number;
  readonly height: number;
}

/** Высота альбомной (landscape) картинки 16:9 по заданной ширине, округлённая до целого px. */
function landscapeHeight169(width: number): number {
  return Math.round((width * 9) / 16);
}

/**
 * Размеры симулятора вьюпорта (`stream.Front#118`, доработка) — все три
 * пресета в альбомной ориентации (ширина больше высоты), базовая высота
 * считается из ширины как 16:9: «Маленький» — мобильный (375×211, высоту
 * можно переопределить вручную, см. `smallViewportHeightPx`), «Средний» —
 * планшет (768×432, дефолт), «Большой» — десктоп (1366×768). Для среднего/
 * большого — и ширина, и высота строго фиксированы пресетом (не редактируются
 * — по прямому запросу пользователя «там грид зависит только от экрана»).
 */
const VIEWPORT_PRESET_SIZES: Record<PinnedGridViewport, ViewportPresetSize> = {
  small: { width: 375, height: landscapeHeight169(375) },
  middle: { width: 768, height: landscapeHeight169(768) },
  large: { width: 1366, height: landscapeHeight169(1366) },
};

const VIEWPORT_PRESET_OPTIONS: { label: string; value: PinnedGridViewport }[] = [
  { label: `Маленький (мобильный, ${VIEWPORT_PRESET_SIZES.small.width}×…)`, value: 'small' },
  {
    label: `Средний (планшет, ${VIEWPORT_PRESET_SIZES.middle.width}×${VIEWPORT_PRESET_SIZES.middle.height})`,
    value: 'middle',
  },
  {
    label: `Большой (десктоп, ${VIEWPORT_PRESET_SIZES.large.width}×${VIEWPORT_PRESET_SIZES.large.height})`,
    value: 'large',
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Визуальный редактор раскладки закреплённых новостей (`stream.Front#118`) —
 * ТРИ независимые раскладки (`PinnedGridLayout`), по одной на пресет
 * вьюпорта (`viewportPreset`) — переключение пресета переключает на
 * полностью отдельные размер сетки и расстановку карточек (доработка, по
 * прямому запросу пользователя «колонки и строки у каждого вьюпорта свои,
 * так же как и карточки новостей», как настоящий responsive-дизайн, а не
 * один грид, визуально сжимающийся под разные экраны).
 *
 * **Добавление карточки** — не сразу на сетку: кнопка «Добавить новость»
 * открывает `p-drawer` (выбор новости с поиском); обложка — НЕ загрузка
 * нового файла, а выбор ОДНОЙ из уже имеющихся у выбранной новости картинок
 * (`NewsItem.imageUrls`, галерея превью, single-select) — если у новости нет
 * картинок вообще, поле просто не показывается (`coverImageUrl` остаётся
 * `null`, `PinnedNewsGrid.effectiveItem()` тогда использует `imageUrl`
 * новости по умолчанию, тот же будет `null`, если картинок нет). После
 * отправки формы редактор входит в режим расстановки (`pendingNews`) — на
 * каждой ячейке рисуется невидимый оверлей, свободные подсвечены плюсом;
 * drag-прямоугольник по ячейкам (`pointerdown`→`pointerenter`→`pointerup`,
 * `placementDrag`) формирует кандидат-слот, валидность которого (не
 * пересекается с уже занятыми, в границах сетки ТЕКУЩЕГО пресета) проверяется
 * на каждое движение через `isSlotPlacementValid`; на `pointerup` невалидная
 * область — toast-ошибка и возврат в тот же режим расстановки (retry),
 * кнопка «Отменить добавление» выходит из режима без создания слота.
 *
 * **На самой карточке — только «Редактировать»/«Удалить»** (`stream.Front#118`,
 * доработка, по прямому запросу пользователя «остальное перенеси в
 * редактирование»): выбор новости и переключение ориентации переехали внутрь
 * drawer'а редактирования (ниже) — на карточке из функциональных элементов
 * остались только эти две кнопки плюс сам drag/resize (не кнопка, прямое
 * манипулирование).
 *
 * **Редактирование карточки** — кнопка-карандаш открывает ОДИН drawer со
 * всеми контролами слота: выбор новости (`optionsForSlot`/`onEditFormNewsChange`
 * — смена новости меняет `newsId` слота и тут же переносит `editingNewsId` на
 * новый id, чтобы редактор не "потерял" слот), переключение ориентации
 * (`canToggleOrientation`/`onToggleOrientation`, применяется сразу, не через
 * «Сохранить»), и стиль (сторона картинки, доля площади под картинку, зум/
 * пан, цвет фона/текста) — НЕ оверлеем поверх самой карточки (по прямому
 * запросу пользователя: "чтобы видеть, что меняешь", раньше панель
 * перекрывала превью). Сама карточка в сетке продолжает рендерить настоящий
 * `NewsCard` с `[cardStyle]="previewStyle(slot)"` — пока редактируется именно
 * она, это `draftStyle()` (живое превью прямо в сетке, синхронно с движением
 * ползунков в drawer'е), для остальных — их сохранённый `slot.style`; drag/
 * resize у всех карточек при этом отключены (`onPointerDown` игнорирует,
 * пока `editingNewsId()` не `null`). «Сохранить» переносит стиль в `localLayouts`
 * и закрывает drawer, «Отмена» (кнопка, Esc, клик по backdrop — все три ведут
 * в `onStyleDrawerVisibleChange`) — без изменений стиля (смена новости/
 * ориентации уже применена сразу, эти два действия не входят в «отмену»).
 *
 * **Размер сетки** — реальная настройка ТЕКУЩЕГО пресета (персистится вместе
 * со слотами через `save`), не локальный превью-симулятор. Инпуты кол-ва
 * строк/колонок (`columnsDraft`/`rowsDraft`) применяются кнопкой «Применить»,
 * а не на каждое изменение — `computeGridResizeImpact()` заранее считает,
 * какие слоты обрежутся/не поместятся вовсе; если что-то из этого произойдёт
 * — `ConfirmModal` с сводкой до применения (админ явно попросил не терять
 * карточки молча), если нет — применяется сразу.
 *
 * **Подсветка сетки/симулятор вьюпорта** — чисто визуальные инструменты
 * редактора (`gridHighlightEnabled`, `viewportPreset`), не персистятся сами
 * по себе (в отличие от того, ЧТО выбрано текущим пресетом — размер
 * сетки/карточки — это персистится). Симулятор — три пресета
 * (`VIEWPORT_PRESET_SIZES`, все альбомные — 16:9): для «Маленького» высоту
 * можно вписать вручную (`smallViewportHeightPx`, по прямому запросу
 * пользователя — реальные мобильные экраны сильно различаются по высоте),
 * ширина остаётся фиксированной 375; «Средний»/«Большой» — строго фиксированы
 * пресетом целиком (админ не редактирует).
 *
 * Драг/ресайз/добавление — голые Pointer Events (Angular CDK не подключён в
 * проекте), тот же приём, что и в исходной версии редактора (`#118`,
 * `pointerdown` на `window` через `AbortController`).
 */
@Component({
  selector: 'app-pinned-grid-editor',
  imports: [Button, Select, DrawerModule, NewsCard],
  templateUrl: './pinned-grid-editor.html',
  styleUrl: './pinned-grid-editor.scss',
})
export class PinnedGridEditor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);

  readonly news = input.required<NewsItem[]>();
  readonly layouts = input.required<Record<PinnedGridViewport, PinnedGridLayout>>();
  readonly save = output<Record<PinnedGridViewport, PinnedGridLayout>>();

  protected readonly emptyTags: NewsTag[] = [];
  protected readonly imagePositionOptions = IMAGE_POSITION_OPTIONS;

  protected readonly localLayouts = linkedSignal<Record<PinnedGridViewport, PinnedGridLayout>>(() => this.layouts());
  protected readonly dragState = signal<DragState | null>(null);

  protected readonly gridHighlightEnabled = signal(false);
  protected readonly viewportPreset = signal<PinnedGridViewport>('middle');
  protected readonly viewportPresetOptions = VIEWPORT_PRESET_OPTIONS;
  protected readonly smallViewportHeightPx = signal(VIEWPORT_PRESET_SIZES.small.height);

  protected readonly viewportSize = computed<ViewportPresetSize>(() => {
    const preset = this.viewportPreset();
    if (preset === 'small') {
      return { width: VIEWPORT_PRESET_SIZES.small.width, height: this.smallViewportHeightPx() };
    }
    return VIEWPORT_PRESET_SIZES[preset];
  });

  protected readonly currentLayout = computed(() => this.localLayouts()[this.viewportPreset()]);
  protected readonly localGridConfig = computed(() => this.currentLayout().config);

  // Отбрасывает "осиротевшие" слоты, чей `newsId` не резолвится ни в одну
  // новость из `news()` (`stream.Front#118`, доработка — справочник новостей
  // теперь реальный, `AdminNewsService`, а не мок-семёрка; старые слоты из
  // `NewsService`'s `MOCK_PINNED_SLOTS` больше не совпадают ни с одним
  // реальным id). Без этой фильтрации такие слоты не рендерились бы
  // карточкой (`entries()` их и так отсеивает), но продолжали бы "занимать"
  // свои ячейки в `isCellOccupied()`/валидации — невидимые призраки, вечно
  // блокирующие расстановку новых карточек. Пересчитывается на каждое чтение
  // (не одноразовый `linkedSignal`-сброс, как раньше) — источник теперь два
  // сигнала (`currentLayout()`, `news()`), а не один вход.
  protected readonly localSlots = computed(() => {
    const newsIds = new Set(this.news().map((item) => item.id));
    return this.currentLayout().slots.filter((slot) => newsIds.has(slot.newsId));
  });

  protected readonly columnsDraft = linkedSignal(() => this.localGridConfig().columns);
  protected readonly rowsDraft = linkedSignal(() => this.localGridConfig().rows);

  protected readonly addDrawerVisible = signal(false);
  protected readonly addFormNewsId = signal<string | null>(null);
  protected readonly addFormCoverUrl = signal<string | null>(null);
  protected readonly pendingNews = signal<PendingNews | null>(null);
  protected readonly placementDrag = signal<PlacementDrag | null>(null);

  protected readonly editingNewsId = signal<string | null>(null);
  protected readonly draftStyle = signal<PinnedNewsCardStyle | null>(null);

  protected readonly editingSlot = computed(() => {
    const newsId = this.editingNewsId();
    return newsId ? (this.localSlots().find((slot) => slot.newsId === newsId) ?? null) : null;
  });

  protected readonly entries = computed(() => {
    const newsById = new Map(this.news().map((item) => [item.id, item]));
    return this.localSlots().map((slot) => ({ slot, item: newsById.get(slot.newsId)! }));
  });

  protected readonly gridTemplateColumns = computed(
    () => `repeat(${this.localGridConfig().columns}, minmax(0, 1fr))`,
  );
  protected readonly gridTemplateRows = computed(() => `repeat(${this.localGridConfig().rows}, 1fr)`);

  protected readonly cells = computed<GridCell[]>(() => {
    const { columns, rows } = this.localGridConfig();
    const result: GridCell[] = [];
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= columns; col++) {
        result.push({ col, row });
      }
    }
    return result;
  });

  protected readonly unusedNewsForAdd = computed(() => {
    const usedIds = new Set(this.localSlots().map((slot) => slot.newsId));
    return this.news().filter((item) => !usedIds.has(item.id));
  });

  /** Картинки выбранной в форме добавления новости (`stream.Front#118`) — источник для выбора обложки пина, не отдельная загрузка файла. */
  protected readonly addFormNewsImages = computed(() => {
    const newsId = this.addFormNewsId();
    return this.news().find((item) => item.id === newsId)?.imageUrls ?? [];
  });

  protected readonly canSubmitAddForm = computed(() => this.addFormNewsId() !== null);

  protected readonly placementRect = computed(() => {
    const drag = this.placementDrag();
    if (!drag) {
      return null;
    }
    return {
      colStart: Math.min(drag.startCol, drag.col),
      rowStart: Math.min(drag.startRow, drag.row),
      colSpan: Math.abs(drag.col - drag.startCol) + 1,
      rowSpan: Math.abs(drag.row - drag.startRow) + 1,
    };
  });

  protected readonly placementValid = computed(() => {
    const rect = this.placementRect();
    if (!rect) {
      return true;
    }
    const candidate: PinnedNewsSlot = {
      newsId: '__placement__',
      colStart: rect.colStart,
      rowStart: rect.rowStart,
      colSpan: rect.colSpan,
      rowSpan: rect.rowSpan,
      style: DEFAULT_CARD_STYLE,
      coverImageUrl: null,
    };
    const { columns, rows } = this.localGridConfig();
    return isSlotPlacementValid(candidate, this.localSlots(), columns, rows);
  });

  protected displaySlot(slot: PinnedNewsSlot): PinnedNewsSlot {
    const state = this.dragState();
    return state && state.newsId === slot.newsId ? state.preview : slot;
  }

  protected isDraggingInvalid(newsId: string): boolean {
    const state = this.dragState();
    return state !== null && state.newsId === newsId && !state.valid;
  }

  /** Стиль карточки для рендера: пока идёт редактирование ИМЕННО этого слота — черновик (`draftStyle`, живое превью в самой сетке), иначе — сохранённый `slot.style`. Сама панель контролов — отдельный `p-drawer` (`stream.Front#118`, доработка: "вне карточки, чтобы видеть, что меняешь"), не оверлей поверх превью. */
  protected previewStyle(slot: PinnedNewsSlot): PinnedNewsCardStyle {
    const draft = this.draftStyle();
    return this.editingNewsId() === slot.newsId && draft ? draft : slot.style;
  }

  protected gridColumn(slot: PinnedNewsSlot): string {
    return `${slot.colStart} / span ${slot.colSpan}`;
  }

  protected gridRow(slot: PinnedNewsSlot): string {
    return `${slot.rowStart} / span ${slot.rowSpan}`;
  }

  protected cellGridColumn(cell: GridCell): string {
    return `${cell.col} / span 1`;
  }

  protected cellGridRow(cell: GridCell): string {
    return `${cell.row} / span 1`;
  }

  protected isCellOccupied(cell: GridCell): boolean {
    return this.localSlots().some(
      (slot) =>
        cell.col >= slot.colStart &&
        cell.col <= slot.colStart + slot.colSpan - 1 &&
        cell.row >= slot.rowStart &&
        cell.row <= slot.rowStart + slot.rowSpan - 1,
    );
  }

  protected placementRectGridColumn(): string {
    const rect = this.placementRect();
    return rect ? `${rect.colStart} / span ${rect.colSpan}` : '1 / span 1';
  }

  protected placementRectGridRow(): string {
    const rect = this.placementRect();
    return rect ? `${rect.rowStart} / span ${rect.rowSpan}` : '1 / span 1';
  }

  protected onViewportPresetChange(preset: PinnedGridViewport | null): void {
    if (!preset) {
      return;
    }
    this.viewportPreset.set(preset);
  }

  protected onSmallViewportHeightInput(value: string): void {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 1) {
      return;
    }
    this.smallViewportHeightPx.set(numeric);
  }

  protected optionsForSlot(currentNewsId: string): NewsItem[] {
    const usedIds = new Set(this.localSlots().map((slot) => slot.newsId));
    return this.news().filter((item) => item.id === currentNewsId || !usedIds.has(item.id));
  }

  protected onSlotNewsChange(oldNewsId: string, newNewsId: string | null): void {
    if (!newNewsId || newNewsId === oldNewsId) {
      return;
    }
    this.updateCurrentSlots((slots) =>
      slots.map((slot) => (slot.newsId === oldNewsId ? { ...slot, newsId: newNewsId } : slot)),
    );
  }

  /** Смена новости прямо из drawer'а редактирования — в отличие от `onSlotNewsChange` (селект на карточке, `stream.Front#112`), здесь ещё нужно перевести `editingNewsId` на новый id, иначе drawer "потеряет" редактируемый слот (ключ поиска — сам `newsId`, отдельного id у слота нет). */
  protected onEditFormNewsChange(oldNewsId: string, newNewsId: string | null): void {
    if (!newNewsId || newNewsId === oldNewsId) {
      return;
    }
    this.onSlotNewsChange(oldNewsId, newNewsId);
    this.editingNewsId.set(newNewsId);
  }

  protected canToggleOrientation(slot: PinnedNewsSlot): boolean {
    const candidate: PinnedNewsSlot = { ...slot, colSpan: slot.rowSpan, rowSpan: slot.colSpan };
    const { columns, rows } = this.localGridConfig();
    return isSlotPlacementValid(candidate, this.otherSlots(slot.newsId), columns, rows);
  }

  protected onToggleOrientation(slot: PinnedNewsSlot): void {
    if (!this.canToggleOrientation(slot)) {
      return;
    }
    this.updateCurrentSlots((slots) =>
      slots.map((item) =>
        item.newsId === slot.newsId ? { ...item, colSpan: item.rowSpan, rowSpan: item.colSpan } : item,
      ),
    );
  }

  protected onRemoveSlot(newsId: string): void {
    this.updateCurrentSlots((slots) => slots.filter((slot) => slot.newsId !== newsId));
    if (this.editingNewsId() === newsId) {
      this.editingNewsId.set(null);
      this.draftStyle.set(null);
    }
  }

  protected onSaveClick(): void {
    // Отбрасываем осиротевшие слоты и в сохраняемых данных, не только в
    // рендере (`localSlots()` уже отфильтрован) — иначе они молча копились бы
    // на backend навсегда.
    const layouts = this.localLayouts();
    const newsIds = new Set(this.news().map((item) => item.id));
    const cleaned = Object.fromEntries(
      (Object.entries(layouts) as [PinnedGridViewport, PinnedGridLayout][]).map(([viewport, layout]) => [
        viewport,
        { ...layout, slots: layout.slots.filter((slot) => newsIds.has(slot.newsId)) },
      ]),
    ) as Record<PinnedGridViewport, PinnedGridLayout>;
    this.save.emit(cleaned);
  }

  protected onPointerDown(event: PointerEvent, slot: PinnedNewsSlot, kind: DragKind): void {
    if (this.editingNewsId() !== null || this.pendingNews() !== null) {
      return;
    }
    // Хэндлы ресайза — дети карточки, у которой свой pointerdown (kind: 'move')
    // на весь хост; без stopPropagation событие с хэндла всплыло бы туда и
    // перезаписало dragState обратно на 'move' сразу после установки.
    event.stopPropagation();
    event.preventDefault();
    this.dragState.set({
      newsId: slot.newsId,
      kind,
      startX: event.clientX,
      startY: event.clientY,
      startSlot: slot,
      preview: slot,
      valid: true,
    });

    const controller = new AbortController();
    window.addEventListener('pointermove', (moveEvent) => this.onPointerMove(moveEvent), {
      signal: controller.signal,
    });
    window.addEventListener(
      'pointerup',
      () => {
        this.commitDrag();
        controller.abort();
      },
      { signal: controller.signal },
    );
    this.destroyRef.onDestroy(() => controller.abort());
  }

  private onPointerMove(event: PointerEvent): void {
    const state = this.dragState();
    if (!state) {
      return;
    }
    const { columns, rows } = this.localGridConfig();

    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const cellWidth = (rect.width - GRID_GAP_PX * (columns - 1)) / columns;
    const cellHeight = (rect.height - GRID_GAP_PX * (rows - 1)) / rows;
    const deltaCol = Math.round((event.clientX - state.startX) / (cellWidth + GRID_GAP_PX));
    const deltaRow = Math.round((event.clientY - state.startY) / (cellHeight + GRID_GAP_PX));

    let candidate: PinnedNewsSlot;
    if (state.kind === 'move') {
      candidate = {
        ...state.startSlot,
        colStart: clamp(state.startSlot.colStart + deltaCol, 1, columns - state.startSlot.colSpan + 1),
        rowStart: clamp(state.startSlot.rowStart + deltaRow, 1, rows - state.startSlot.rowSpan + 1),
      };
    } else if (state.kind === 'col') {
      candidate = {
        ...state.startSlot,
        colSpan: clamp(state.startSlot.colSpan + deltaCol, 1, columns - state.startSlot.colStart + 1),
      };
    } else {
      candidate = {
        ...state.startSlot,
        rowSpan: clamp(state.startSlot.rowSpan + deltaRow, 1, rows - state.startSlot.rowStart + 1),
      };
    }

    const valid = isSlotPlacementValid(candidate, this.otherSlots(state.newsId), columns, rows);
    this.dragState.set({ ...state, preview: candidate, valid });
  }

  private commitDrag(): void {
    const state = this.dragState();
    this.dragState.set(null);
    if (!state || !state.valid) {
      return;
    }
    this.updateCurrentSlots((slots) =>
      slots.map((slot) => (slot.newsId === state.newsId ? state.preview : slot)),
    );
  }

  private otherSlots(newsId: string): PinnedNewsSlot[] {
    return this.localSlots().filter((slot) => slot.newsId !== newsId);
  }

  protected onAddClick(): void {
    this.addFormNewsId.set(null);
    this.addFormCoverUrl.set(null);
    this.addDrawerVisible.set(true);
  }

  protected onAddFormNewsChange(newsId: string | null): void {
    this.addFormNewsId.set(newsId);
    // Смена новости — сброс выбранной обложки: список картинок на выбор
    // теперь другой (`addFormNewsImages`), старый выбор мог не относиться к
    // новой новости.
    this.addFormCoverUrl.set(null);
  }

  protected onAddFormSubmit(): void {
    const newsId = this.addFormNewsId();
    if (!newsId) {
      return;
    }
    this.pendingNews.set({ newsId, coverImageUrl: this.addFormCoverUrl() });
    this.addDrawerVisible.set(false);
  }

  protected onCancelPlacement(): void {
    this.pendingNews.set(null);
    this.placementDrag.set(null);
  }

  protected onPlacementCellPointerDown(cell: GridCell): void {
    if (!this.pendingNews() || this.isCellOccupied(cell)) {
      return;
    }
    this.placementDrag.set({ startCol: cell.col, startRow: cell.row, col: cell.col, row: cell.row });

    const controller = new AbortController();
    window.addEventListener(
      'pointerup',
      () => {
        this.commitPlacement();
        controller.abort();
      },
      { signal: controller.signal },
    );
    this.destroyRef.onDestroy(() => controller.abort());
  }

  protected onPlacementCellPointerEnter(cell: GridCell): void {
    const drag = this.placementDrag();
    if (!drag) {
      return;
    }
    this.placementDrag.set({ ...drag, col: cell.col, row: cell.row });
  }

  private commitPlacement(): void {
    const drag = this.placementDrag();
    const pending = this.pendingNews();
    const rect = this.placementRect();
    if (!drag || !pending || !rect) {
      return;
    }

    if (!this.placementValid()) {
      this.notificationService.show('Эти ячейки уже заняты — выберите другую область', 'error');
      this.placementDrag.set(null);
      return;
    }

    this.updateCurrentSlots((slots) => [
      ...slots,
      {
        newsId: pending.newsId,
        colStart: rect.colStart,
        rowStart: rect.rowStart,
        colSpan: rect.colSpan,
        rowSpan: rect.rowSpan,
        style: DEFAULT_CARD_STYLE,
        coverImageUrl: pending.coverImageUrl,
      },
    ]);
    this.placementDrag.set(null);
    this.pendingNews.set(null);
  }

  protected onEditStyleClick(slot: PinnedNewsSlot): void {
    this.editingNewsId.set(slot.newsId);
    this.draftStyle.set(slot.style);
  }

  protected onImagePositionChange(position: CardImagePosition | null): void {
    if (!position) {
      return;
    }
    this.draftStyle.update((style) => (style ? { ...style, imagePosition: position } : style));
  }

  protected onDraftStyleNumberInput(field: DraftStyleNumberField, value: string): void {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return;
    }
    this.draftStyle.update((style) => (style ? { ...style, [field]: numeric } : style));
  }

  protected onDraftColorInput(field: DraftStyleColorField, value: string): void {
    this.draftStyle.update((style) => (style ? { ...style, [field]: value } : style));
  }

  protected onSaveStyleClick(): void {
    const newsId = this.editingNewsId();
    const style = this.draftStyle();
    if (!newsId || !style) {
      return;
    }
    this.updateCurrentSlots((slots) => slots.map((slot) => (slot.newsId === newsId ? { ...slot, style } : slot)));
    this.editingNewsId.set(null);
    this.draftStyle.set(null);
  }

  protected onCancelStyleClick(): void {
    this.editingNewsId.set(null);
    this.draftStyle.set(null);
  }

  /** Закрытие drawer'а редактирования не только кнопкой «Отмена» — Esc/клик по backdrop у `p-drawer` меняют `visible` сами, тот же путь отмены. */
  protected onStyleDrawerVisibleChange(visible: boolean): void {
    if (!visible) {
      this.onCancelStyleClick();
    }
  }

  protected onApplyGridSizeClick(): void {
    const newColumns = this.columnsDraft();
    const newRows = this.rowsDraft();
    if (newColumns < 1 || newRows < 1) {
      this.notificationService.show('Число строк/колонок должно быть не меньше 1', 'error');
      return;
    }

    const impact = computeGridResizeImpact(this.localSlots(), newColumns, newRows);
    const hasImpact = impact.clippedNewsIds.length > 0 || impact.removedNewsIds.length > 0;

    if (!hasImpact) {
      this.applyGridSize(newColumns, newRows, impact.updatedSlots);
      return;
    }

    const parts: string[] = [];
    if (impact.clippedNewsIds.length > 0) {
      parts.push(`будут обрезаны по размеру: ${impact.clippedNewsIds.join(', ')}`);
    }
    if (impact.removedNewsIds.length > 0) {
      parts.push(`будут удалены (не помещаются вообще): ${impact.removedNewsIds.join(', ')}`);
    }

    this.modalService.open<ConfirmModalData>(ConfirmModal, {
      message: `При изменении размера сетки: ${parts.join('; ')}. Продолжить?`,
      confirmText: 'Применить',
      onConfirm: () => this.applyGridSize(newColumns, newRows, impact.updatedSlots),
    });
  }

  private applyGridSize(columns: number, rows: number, updatedSlots: PinnedNewsSlot[]): void {
    this.setCurrentLayout({ columns, rows }, updatedSlots);
  }

  /** Единая точка правки слотов ТЕКУЩЕГО пресета вьюпорта — читает уже отфильтрованный `localSlots()`, пишет результат обратно в `localLayouts` под ключом активного `viewportPreset()`. */
  private updateCurrentSlots(updater: (slots: PinnedNewsSlot[]) => PinnedNewsSlot[]): void {
    const preset = this.viewportPreset();
    const nextSlots = updater(this.localSlots());
    this.localLayouts.update((layouts) => ({
      ...layouts,
      [preset]: { ...layouts[preset], slots: nextSlots },
    }));
  }

  private setCurrentLayout(config: PinnedGridConfig, slots: PinnedNewsSlot[]): void {
    const preset = this.viewportPreset();
    this.localLayouts.update((layouts) => ({ ...layouts, [preset]: { config, slots } }));
  }
}
