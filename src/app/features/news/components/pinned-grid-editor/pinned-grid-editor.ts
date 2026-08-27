import { Component, DestroyRef, ElementRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DrawerModule } from 'primeng/drawer';

import { AdminNewsService } from '@features/admin/services/admin-news.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { ConfirmModal, ConfirmModalData } from '@shared/components/confirm-modal/confirm-modal';
import { FocalPointPicker, FocalPointValue } from '@shared/components/focal-point-picker/focal-point-picker';
import { Select } from '@shared/components/select/select';
import {
  CUSTOM_SCREEN_SIZE_KEY,
  GridAreaSize,
  SCREEN_SIZE_PRESETS,
  ScreenSizePreset,
  computePinnedGridAreaSize,
  resolvePinnedGridViewport,
} from '@shared/utils/pinned-grid-geometry';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import {
  CardImagePosition,
  DEFAULT_CARD_STYLE,
  FocalPoint,
  PINNED_GRID_VIEWPORTS,
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

/**
 * Минимальная высота строки сетки РЕДАКТОРА на `small` (баг «лишний скролл,
 * странный вид» — пустые `1fr`-строки при `height: auto` контейнера
 * схлопывались в 0, редактировать было нечем). На реальной странице
 * (`pinned-news-grid.scss`) высота строк там НЕ фиксирована — растёт по
 * контенту карточек, поэтому это число значимо только внутри редактора,
 * ничего не зеркалит из `news-page.scss`.
 */
const EDITOR_SMALL_MIN_ROW_HEIGHT_PX = 160;

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

interface NewsMeta {
  readonly style: PinnedNewsCardStyle;
  readonly coverImageUrl: string | null;
}

type DraftStyleNumberField = 'imageSizePercent';
type DraftStyleColorField = 'backgroundColor' | 'textColor';

const IMAGE_POSITION_OPTIONS: { label: string; value: CardImagePosition }[] = [
  { label: 'Сверху', value: 'top' },
  { label: 'Справа', value: 'right' },
  { label: 'Снизу', value: 'bottom' },
  { label: 'Слева', value: 'left' },
];

/** Дефолтный пресет экрана — попадает в `PinnedGridViewport.large` (1180px, альбомная ориентация ≥768×600). */
const DEFAULT_SCREEN_PRESET_KEY = 'tablet-landscape';

const SCREEN_PRESET_SELECT_OPTIONS: { label: string; value: string }[] = [
  ...SCREEN_SIZE_PRESETS.map((preset) => ({ label: preset.label, value: preset.key })),
  { label: 'Свой размер', value: CUSTOM_SCREEN_SIZE_KEY },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Первая свободная ячейка 1×1 в `columns`×`rows`, не занятая ни одним из `slots` — `null`, если места нет вообще. */
function findFreeCell(slots: readonly PinnedNewsSlot[], columns: number, rows: number): { colStart: number; rowStart: number } | null {
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= columns; col++) {
      const occupied = slots.some(
        (slot) =>
          col >= slot.colStart &&
          col <= slot.colStart + slot.colSpan - 1 &&
          row >= slot.rowStart &&
          row <= slot.rowStart + slot.rowSpan - 1,
      );
      if (!occupied) {
        return { colStart: col, rowStart: row };
      }
    }
  }
  return null;
}

/**
 * Визуальный редактор раскладки закреплённых новостей (`stream.Front#118`,
 * переработан под общий набор закреплённых новостей — `pinned-grid-rework`).
 *
 * **Набор закреплённых новостей — ОБЩИЙ между `small`/`large`** (прямое
 * решение пользователя «закрепил один раз — появилось в обеих раскладках»):
 * стиль/обложка (`PinnedNewsCardStyle`/`coverImageUrl`) хранятся ОДИН раз на
 * новость (`pinnedMeta`, вычисляется из слотов ОБЕИХ раскладок — какая из
 * них первой встретит `newsId`, у той и берётся, они обязаны совпадать) —
 * позиция (`colStart`/`rowStart`/`colSpan`/`rowSpan`) — своя на каждую
 * раскладку. В раскладке, которую админ прямо сейчас не редактирует, новость
 * появляется автоматически — `1×1`, первая свободная ячейка
 * (`reconciledLayouts`, чистый `computed`, ничего не пишет в `localLayouts`,
 * пока admin реально не провзаимодействует с этой раскладкой — драг/ресайз/
 * редактирование стиля/ресайз сетки материализуют её в `localLayouts`).
 *
 * **Асимметрия при нехватке места** (прямое решение пользователя) — на
 * `small` строки автоматически добавляются (`config.rows + 1`, реальная
 * страница на `small` `height: auto` и скроллится, места всегда можно
 * нарастить); на `large` сетка обязана уместиться в экран — если свободной
 * ячейки нет, новость уходит в список «не размещено»
 * (`unplacedForLargeIds`), явно показанный админу с предупреждением, вместо
 * молчаливой пропажи. Разместить вручную — кнопка у карточки списка, запускает
 * тот же drag-прямоугольник, что и обычное добавление.
 *
 * **Focal point — у картинки, не у слота** (`pinned-grid-rework`) — пикер
 * (`FocalPointPicker`) встроен в drawer редактирования карточки, на месте
 * бывших ползунков зума/пана; сохраняется отдельным запросом
 * (`AdminNewsService.updateImageFocalPoint()`), не через «Сохранить»
 * раскладки — влияет на все места, где эта картинка показывается.
 * `focalOverrides` — локальный оптимистичный кэш применённых точек (по `id`
 * картинки), пока родитель не перезагрузит `news()` с backend.
 *
 * Остальное — без изменений (`stream.Front#118`): драг/ресайз/добавление —
 * голые Pointer Events, размер сетки/подсветка/геометрия холста/предпросмотр
 * «как посетитель» — та же механика, что раньше.
 */
@Component({
  selector: 'app-pinned-grid-editor',
  imports: [Button, Select, DrawerModule, NewsCard, FocalPointPicker],
  templateUrl: './pinned-grid-editor.html',
  styleUrl: './pinned-grid-editor.scss',
})
export class PinnedGridEditor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly adminNewsService = inject(AdminNewsService);

  readonly news = input.required<NewsItem[]>();
  readonly layouts = input.required<Record<PinnedGridViewport, PinnedGridLayout>>();
  readonly save = output<Record<PinnedGridViewport, PinnedGridLayout>>();

  protected readonly emptyTags: NewsTag[] = [];
  protected readonly imagePositionOptions = IMAGE_POSITION_OPTIONS;

  protected readonly localLayouts = linkedSignal<Record<PinnedGridViewport, PinnedGridLayout>>(() => this.layouts());
  protected readonly dragState = signal<DragState | null>(null);

  protected readonly gridHighlightEnabled = signal(false);

  protected readonly screenPresetKey = signal(DEFAULT_SCREEN_PRESET_KEY);
  protected readonly screenPresetOptions = SCREEN_PRESET_SELECT_OPTIONS;
  protected readonly customScreenSizeKey = CUSTOM_SCREEN_SIZE_KEY;
  protected readonly customScreenWidth = signal(1366);
  protected readonly customScreenHeight = signal(768);

  /** `id` картинки → применённая (но ещё не отражённая в `news()`) точка фокуса, оптимистичный локальный кэш для `FocalPointPicker`. */
  private readonly focalOverrides = signal<Record<string, FocalPoint | null>>({});

  /** Реальный размер окна браузера для холста/предпросмотра — либо готовый пресет, либо ручной ввод («Свой размер»). */
  protected readonly screenSize = computed<{ width: number; height: number }>(() => {
    const key = this.screenPresetKey();
    if (key === CUSTOM_SCREEN_SIZE_KEY) {
      return { width: this.customScreenWidth(), height: this.customScreenHeight() };
    }
    const preset: ScreenSizePreset | undefined = SCREEN_SIZE_PRESETS.find((item) => item.key === key);
    return preset ?? SCREEN_SIZE_PRESETS[0];
  });

  /** Какая из двух раскладок (`PinnedGridViewport`) сейчас редактируется — выведена из `screenSize()` теми же порогами, что `_breakpoints.scss` (учитывают ориентацию), не отдельный контрол. */
  protected readonly viewportPreset = computed<PinnedGridViewport>(() =>
    resolvePinnedGridViewport(this.screenSize().width, this.screenSize().height),
  );

  /** Реальная площадь под сетку на странице `/news` для `screenSize()` — см. `computePinnedGridAreaSize()`. */
  protected readonly gridAreaSize = computed<GridAreaSize>(() =>
    computePinnedGridAreaSize(this.screenSize().width, this.screenSize().height),
  );

  protected readonly previewMode = signal(false);
  protected readonly previewRefreshToken = signal(0);

  protected readonly previewSrc = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`/news?pinnedGridPreview=${this.previewRefreshToken()}`),
  );

  private readonly existingNewsIds = computed(() => new Set(this.news().map((item) => item.id)));

  /** Стиль/обложка — общие на обе раскладки, принадлежат новости: берётся из ПЕРВОЙ раскладки (`small`, затем `large`), в которой уже встречается `newsId`. */
  private readonly pinnedMeta = computed<Record<string, NewsMeta>>(() => {
    const layouts = this.localLayouts();
    const existing = this.existingNewsIds();
    const result: Record<string, NewsMeta> = {};
    for (const viewport of PINNED_GRID_VIEWPORTS) {
      for (const slot of layouts[viewport].slots) {
        if (existing.has(slot.newsId) && !(slot.newsId in result)) {
          result[slot.newsId] = { style: slot.style, coverImageUrl: slot.coverImageUrl };
        }
      }
    }
    return result;
  });

  /**
   * Чистая проекция `localLayouts()` — в каждой раскладке появляются все
   * закреплённые новости (`pinnedMeta`), даже те, что реально размещены
   * только в другой раскладке (авто-`1×1`, первая свободная ячейка; `small`
   * при нехватке места добавляет строку, `large` — не может, такие новости
   * попадают в `unplacedForLarge` вместо слота). НИЧЕГО не пишет обратно в
   * `localLayouts` — материализация происходит только при реальном
   * взаимодействии (см. `updateCurrentSlots()`/`onSaveClick()`).
   */
  private readonly reconciled = computed<{
    layouts: Record<PinnedGridViewport, PinnedGridLayout>;
    unplacedForLarge: string[];
  }>(() => {
    const layouts = this.localLayouts();
    const meta = this.pinnedMeta();
    const existing = this.existingNewsIds();
    const news = this.news();
    const unplacedForLarge: string[] = [];

    const result = {} as Record<PinnedGridViewport, PinnedGridLayout>;
    for (const viewport of PINNED_GRID_VIEWPORTS) {
      let slots = layouts[viewport].slots.filter((slot) => existing.has(slot.newsId));
      let config = layouts[viewport].config;
      const missingIds = Object.keys(meta).filter((newsId) => !slots.some((slot) => slot.newsId === newsId));

      for (const newsId of missingIds) {
        const cell = findFreeCell(slots, config.columns, config.rows);
        if (cell) {
          slots = [...slots, this.buildSlot(newsId, cell.colStart, cell.rowStart, 1, 1, meta[newsId], news)];
        } else if (viewport === 'small') {
          config = { ...config, rows: config.rows + 1 };
          slots = [...slots, this.buildSlot(newsId, 1, config.rows, 1, 1, meta[newsId], news)];
        } else {
          unplacedForLarge.push(newsId);
        }
      }

      result[viewport] = { config, slots };
    }

    return { layouts: result, unplacedForLarge };
  });

  protected readonly currentLayout = computed(() => this.reconciled().layouts[this.viewportPreset()]);
  protected readonly localGridConfig = computed(() => this.currentLayout().config);
  protected readonly localSlots = computed(() => this.currentLayout().slots);

  /** Закреплённые новости, для которых на `large` нет свободного места вообще (не показаны на `large`, только на `small`) — по прямому решению пользователя показаны явным списком с предупреждением, не пропадают молча. */
  protected readonly unplacedForLarge = computed(() => {
    const ids = new Set(this.reconciled().unplacedForLarge);
    return this.news().filter((item) => ids.has(item.id));
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
  protected readonly draftCoverImageUrl = signal<string | null>(null);

  protected readonly editingSlot = computed(() => {
    const newsId = this.editingNewsId();
    return newsId ? (this.localSlots().find((slot) => slot.newsId === newsId) ?? null) : null;
  });

  /** Картинка, для которой сейчас показан `FocalPointPicker` в drawer'е редактирования — обложка слота (`draftCoverImageUrl`), либо первая картинка новости, если обложка не выбрана. */
  protected readonly editingFocalImage = computed(() => {
    const newsId = this.editingNewsId();
    if (!newsId) {
      return null;
    }
    const item = this.news().find((entry) => entry.id === newsId);
    if (!item) {
      return null;
    }
    const coverUrl = this.draftCoverImageUrl();
    const image = coverUrl ? item.images.find((entry) => entry.url === coverUrl) : item.images[0];
    return image ?? null;
  });

  protected readonly editingFocalPoint = computed<FocalPointValue | null>(() => {
    const image = this.editingFocalImage();
    if (!image) {
      return null;
    }
    const override = this.focalOverrides()[image.id];
    if (override !== undefined) {
      return override;
    }
    return image.focalX !== null && image.focalY !== null ? { x: image.focalX, y: image.focalY } : null;
  });

  protected readonly entries = computed(() => {
    const newsById = new Map(this.news().map((item) => [item.id, item]));
    return this.localSlots().map((slot) => ({ slot, item: newsById.get(slot.newsId)! }));
  });

  protected readonly gridTemplateColumns = computed(
    () => `repeat(${this.localGridConfig().columns}, minmax(0, 1fr))`,
  );

  /**
   * На `large` (`gridAreaSize().height` — число) строки обязаны честно
   * делить фиксированную высоту холста — голый `1fr`. На `small`
   * (`height === null`, холст `height: auto`) голый `1fr` схлопывает пустые
   * строки в 0 — `minmax(EDITOR_SMALL_MIN_ROW_HEIGHT_PX, 1fr)` даёт им
   * видимый пол, оставляя рост по контенту (как на реальной странице) —
   * итоговая высота холста складывается браузером из суммы этих полов, а не
   * задаётся здесь пиксельно.
   */
  protected readonly gridTemplateRows = computed(() => {
    const { rows } = this.localGridConfig();
    return this.gridAreaSize().height === null
      ? `repeat(${rows}, minmax(${EDITOR_SMALL_MIN_ROW_HEIGHT_PX}px, 1fr))`
      : `repeat(${rows}, 1fr)`;
  });

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
    const usedIds = new Set(Object.keys(this.pinnedMeta()));
    return this.news().filter((item) => !usedIds.has(item.id));
  });

  /** Картинки выбранной в форме добавления новости (`stream.Front#118`) — источник для выбора обложки пина, не отдельная загрузка файла. */
  protected readonly addFormNewsImages = computed(() => {
    const newsId = this.addFormNewsId();
    return this.news().find((item) => item.id === newsId)?.imageUrls ?? [];
  });

  /** То же самое, что `addFormNewsImages`, но для новости УЖЕ добавленного слота — источник галереи обложки в drawer'е редактирования. */
  protected readonly editingNewsImages = computed(() => {
    const slot = this.editingSlot();
    return slot ? (this.news().find((item) => item.id === slot.newsId)?.imageUrls ?? []) : [];
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
      focalPoint: null,
    };
    const { columns, rows } = this.localGridConfig();
    return isSlotPlacementValid(candidate, this.localSlots(), columns, rows);
  });

  private buildSlot(
    newsId: string,
    colStart: number,
    rowStart: number,
    colSpan: number,
    rowSpan: number,
    meta: NewsMeta,
    news: NewsItem[],
  ): PinnedNewsSlot {
    return {
      newsId,
      colStart,
      rowStart,
      colSpan,
      rowSpan,
      style: meta.style,
      coverImageUrl: meta.coverImageUrl,
      focalPoint: this.resolveFocalPointFor(newsId, meta.coverImageUrl, news),
    };
  }

  private resolveFocalPointFor(newsId: string, coverImageUrl: string | null, news: NewsItem[]): FocalPoint | null {
    const item = news.find((entry) => entry.id === newsId);
    if (!item) {
      return null;
    }
    const image = coverImageUrl ? item.images.find((entry) => entry.url === coverImageUrl) : item.images[0];
    if (!image) {
      return null;
    }
    const override = this.focalOverrides()[image.id];
    if (override !== undefined) {
      return override;
    }
    return image.focalX !== null && image.focalY !== null ? { x: image.focalX, y: image.focalY } : null;
  }

  protected displaySlot(slot: PinnedNewsSlot): PinnedNewsSlot {
    const state = this.dragState();
    return state && state.newsId === slot.newsId ? state.preview : slot;
  }

  protected isDraggingInvalid(newsId: string): boolean {
    const state = this.dragState();
    return state !== null && state.newsId === newsId && !state.valid;
  }

  /** Стиль карточки для рендера: пока идёт редактирование ИМЕННО этого слота — черновик (`draftStyle`, живое превью в самой сетке), иначе — сохранённый `slot.style`. Сама панель контролов — отдельный `p-drawer`, не оверлей поверх превью. */
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

  protected onScreenPresetChange(key: string | null): void {
    if (!key) {
      return;
    }
    this.screenPresetKey.set(key);
  }

  protected onCustomScreenWidthInput(value: string): void {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 1) {
      return;
    }
    this.customScreenWidth.set(numeric);
  }

  protected onCustomScreenHeightInput(value: string): void {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 1) {
      return;
    }
    this.customScreenHeight.set(numeric);
  }

  protected onOpenPreviewClick(): void {
    this.previewMode.set(true);
  }

  protected onClosePreviewClick(): void {
    this.previewMode.set(false);
  }

  protected onRefreshPreviewClick(): void {
    this.previewRefreshToken.update((token) => token + 1);
  }

  protected optionsForSlot(currentNewsId: string): NewsItem[] {
    const usedIds = new Set(Object.keys(this.pinnedMeta()));
    return this.news().filter((item) => item.id === currentNewsId || !usedIds.has(item.id));
  }

  protected onSlotNewsChange(oldNewsId: string, newNewsId: string | null): void {
    if (!newNewsId || newNewsId === oldNewsId) {
      return;
    }
    const current = this.localSlots().find((slot) => slot.newsId === oldNewsId);
    if (!current) {
      return;
    }
    this.removeNewsEverywhere(oldNewsId);
    this.placeInCurrentViewport(
      newNewsId,
      current.colStart,
      current.rowStart,
      current.colSpan,
      current.rowSpan,
      current.style,
      null,
    );
  }

  /** Смена новости прямо из drawer'а редактирования — в отличие от `onSlotNewsChange`, здесь ещё нужно перевести `editingNewsId` на новый id, иначе drawer "потеряет" редактируемый слот (ключ поиска — сам `newsId`, отдельного id у слота нет). */
  protected onEditFormNewsChange(oldNewsId: string, newNewsId: string | null): void {
    if (!newNewsId || newNewsId === oldNewsId) {
      return;
    }
    this.onSlotNewsChange(oldNewsId, newNewsId);
    this.editingNewsId.set(newNewsId);
    // Смена новости — сброс выбранной обложки (та же логика, что и `onAddFormNewsChange`):
    // список картинок на выбор теперь другой, старый выбор мог не относиться к новой новости.
    this.draftCoverImageUrl.set(null);
    const newSlot = this.localSlots().find((slot) => slot.newsId === newNewsId);
    if (newSlot) {
      this.draftStyle.set(newSlot.style);
    }
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
    this.removeNewsEverywhere(newsId);
    if (this.editingNewsId() === newsId) {
      this.editingNewsId.set(null);
      this.draftStyle.set(null);
    }
  }

  protected onSaveClick(): void {
    // Сохраняется РЕКОНСИЛИРОВАННОЕ состояние (`reconciled().layouts`) — каждая
    // закреплённая новость материализуется в ОБЕИХ раскладках (кроме тех, что
    // ушли в `unplacedForLarge` — у них там нет валидного места, они не
    // попадают в `large.slots`, пока админ не разместит их вручную).
    this.save.emit(this.reconciled().layouts);
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

  /** Разместить вручную новость из списка «не размещено на large» — тот же режим drag-прямоугольника, что и обычное добавление, только стиль/обложка уже есть (`pinnedMeta`), не сбрасываются. */
  protected onPlaceUnplacedClick(newsId: string): void {
    const meta = this.pinnedMeta()[newsId];
    this.pendingNews.set({ newsId, coverImageUrl: meta?.coverImageUrl ?? null });
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

    const meta = this.pinnedMeta()[pending.newsId];
    this.placeInCurrentViewport(
      pending.newsId,
      rect.colStart,
      rect.rowStart,
      rect.colSpan,
      rect.rowSpan,
      meta?.style ?? DEFAULT_CARD_STYLE,
      pending.coverImageUrl,
    );
    this.placementDrag.set(null);
    this.pendingNews.set(null);
  }

  protected onEditStyleClick(slot: PinnedNewsSlot): void {
    this.editingNewsId.set(slot.newsId);
    this.draftStyle.set(slot.style);
    this.draftCoverImageUrl.set(slot.coverImageUrl);
  }

  protected onDraftCoverImageChange(url: string | null): void {
    this.draftCoverImageUrl.set(url);
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

  /** `FocalPointPicker.pointCommit` — правит focal point КАРТИНКИ (не слота/раскладки) отдельным запросом, один раз на завершённое перетаскивание (не на каждый `pointChange`), не по «Сохранить». */
  protected onFocalPointChange(point: FocalPointValue | null): void {
    const image = this.editingFocalImage();
    if (!image) {
      return;
    }
    // Откат при ошибке — к ПОСЛЕДНЕМУ известному сохранённому значению (уже
    // применённый override либо исходная точка из `news()`), а не к
    // отсутствию override — иначе `editingFocalPoint()` падает на `null` и
    // маркер визуально «прыгает» в центр, даже если у картинки была
    // сохранена другая точка.
    const previous =
      this.focalOverrides()[image.id] !== undefined
        ? this.focalOverrides()[image.id]
        : image.focalX !== null && image.focalY !== null
          ? { x: image.focalX, y: image.focalY }
          : null;
    this.focalOverrides.update((overrides) => ({ ...overrides, [image.id]: point }));
    this.adminNewsService.updateImageFocalPoint(image.id, { focalX: point?.x ?? null, focalY: point?.y ?? null }).subscribe({
      error: () => {
        this.focalOverrides.update((overrides) => ({ ...overrides, [image.id]: previous }));
        this.notificationService.show('Не удалось сохранить точку фокуса', 'error');
      },
    });
  }

  protected onSaveStyleClick(): void {
    const newsId = this.editingNewsId();
    const style = this.draftStyle();
    if (!newsId || !style) {
      return;
    }
    const coverImageUrl = this.draftCoverImageUrl();
    this.applyMetaToNews(newsId, style, coverImageUrl);
    this.editingNewsId.set(null);
    this.draftStyle.set(null);
    this.draftCoverImageUrl.set(null);
  }

  protected onCancelStyleClick(): void {
    this.editingNewsId.set(null);
    this.draftStyle.set(null);
    this.draftCoverImageUrl.set(null);
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

  /** Единая точка правки слотов ТЕКУЩЕГО пресета вьюпорта — читает уже реконсилированный `localSlots()` (в т.ч. авто-размещённые), пишет результат обратно в `localLayouts` под ключом активного `viewportPreset()`, тем самым материализуя всё, что было видно на экране, включая ранее "виртуальные" слоты. */
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

  /** Убирает новость из ОБЕИХ раскладок разом — открепил один раз, пропадает из обеих. */
  private removeNewsEverywhere(newsId: string): void {
    this.localLayouts.update((layouts) => {
      const next = { ...layouts };
      for (const viewport of PINNED_GRID_VIEWPORTS) {
        next[viewport] = { ...next[viewport], slots: next[viewport].slots.filter((slot) => slot.newsId !== newsId) };
      }
      return next;
    });
  }

  /** Размещает `newsId` в ТЕКУЩЕЙ раскладке по явным координатам (ручное добавление/drag-прямоугольник/смена новости слота) — материализует весь реконсилированный вид текущей раскладки (как `updateCurrentSlots`), другая раскладка при следующем чтении сама доразместит новость автоматически. */
  private placeInCurrentViewport(
    newsId: string,
    colStart: number,
    rowStart: number,
    colSpan: number,
    rowSpan: number,
    style: PinnedNewsCardStyle,
    coverImageUrl: string | null,
  ): void {
    this.updateCurrentSlots((slots) => [
      ...slots,
      this.buildSlot(newsId, colStart, rowStart, colSpan, rowSpan, { style, coverImageUrl }, this.news()),
    ]);
  }

  /** Переносит новый стиль/обложку во ВСЕ слоты этой новости в обеих раскладках (материализованных или ещё виртуальных — виртуальные материализуются заодно). */
  private applyMetaToNews(newsId: string, style: PinnedNewsCardStyle, coverImageUrl: string | null): void {
    const reconciledLayouts = this.reconciled().layouts;
    const news = this.news();
    this.localLayouts.update(() => {
      const next = {} as Record<PinnedGridViewport, PinnedGridLayout>;
      for (const viewport of PINNED_GRID_VIEWPORTS) {
        next[viewport] = {
          config: reconciledLayouts[viewport].config,
          slots: reconciledLayouts[viewport].slots.map((slot) =>
            slot.newsId === newsId
              ? this.buildSlot(newsId, slot.colStart, slot.rowStart, slot.colSpan, slot.rowSpan, { style, coverImageUrl }, news)
              : slot,
          ),
        };
      }
      return next;
    });
  }
}
