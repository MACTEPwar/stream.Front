import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { DrawerModule } from 'primeng/drawer';

import { ImageVariant, NewsCover } from '@features/admin/models/news.model';
import { AdminNewsService } from '@features/admin/services/admin-news.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { ButtonGroup } from '@shared/components/button-group/button-group';
import { ConfirmModal, ConfirmModalData } from '@shared/components/confirm-modal/confirm-modal';
import {
  CoverPicker,
  CoverPickerType,
  CoverPickerValue,
} from '@shared/components/cover-picker/cover-picker';
import {
  FocalPointCropSample,
  FocalPointPicker,
  FocalPointValue,
} from '@shared/components/focal-point-picker/focal-point-picker';
import { Select } from '@shared/components/select/select';
import {
  GridAreaSize,
  PINNED_GRID_CANVAS_SCREENS,
  PinnedGridCanvasDensity,
  computePinnedGridAreaSize,
} from '@shared/utils/pinned-grid-geometry';

import { QuiltReason } from '../news-card/news-card';
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
  PinnedNewsContent,
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
}

/**
 * Общие для обеих раскладок настройки закрепления. Обложки здесь нет
 * (`stream.Front#137`): она осталась свойством новости (`streamer.API#80`), а
 * не пина — `PinnedGridEditor` может её сменить (`CoverPicker` в drawer'е
 * редактирования, `stream.Front#132`), но правит тем самым саму новость
 * (`AdminNewsService.update()`), а не эту структуру.
 */
interface NewsMeta {
  readonly style: PinnedNewsCardStyle;
}

/** Пустая обложка — для служебных слотов и новостей, которых нет в загруженном списке (stream.Front#137). */
const NO_COVER: NewsCover = { type: 'none', url: null, focalPoint: null, variants: [] };

/** Содержимое для служебного слота-кандидата и новостей, которых нет в загруженном списке. */
const EMPTY_CONTENT: PinnedNewsContent = {
  title: '',
  description: '',
  publishedAt: new Date(0).toISOString(),
  viewCount: 0,
  likeCount: 0,
  likedByCurrentUser: null,
  viewedByCurrentUser: null,
  tags: [],
};

type DraftStyleNumberField = 'imageSizePercent';
type DraftStyleColorField = 'backgroundColor' | 'textColor';

const IMAGE_POSITION_OPTIONS: { label: string; value: CardImagePosition }[] = [
  { label: 'Сверху', value: 'top' },
  { label: 'Справа', value: 'right' },
  { label: 'Снизу', value: 'bottom' },
  { label: 'Слева', value: 'left' },
];

const VIEWPORT_TOGGLE_OPTIONS: { label: string; value: PinnedGridViewport }[] = [
  { label: 'Компактная', value: 'small' },
  { label: 'Широкая', value: 'large' },
];

const DENSITY_TOGGLE_OPTIONS: { label: string; value: PinnedGridCanvasDensity }[] = [
  { label: 'Просторно', value: 'reference' },
  { label: 'Тесно', value: 'tight' },
];

const QUILT_REASON_LABELS: Record<Exclude<QuiltReason, null>, string> = {
  picture: 'тесно: не помещается картинка',
  text: 'тесно: не помещается текст',
  both: 'тесно: не помещаются картинка и текст',
};

/** Образцы кадрирования `FocalPointPicker` укладываются в этот квадрат (`ФОК-Ф-04`) — крупнее не даёт места в 420px-drawer'е, мельче нечитаемо. */
const CROP_SAMPLE_MAX_SIDE_PX = 96;
/** Короткая сторона не сжимается ниже этого — иначе на очень вытянутых ячейках превью вырождается в линию. */
const CROP_SAMPLE_MIN_SIDE_PX = 32;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Пиксельный размер образца кадрирования по соотношению сторон реальной ячейки — вписывает в {@link CROP_SAMPLE_MAX_SIDE_PX}, длинная сторона может выйти за него, только если иначе короткая ушла бы ниже {@link CROP_SAMPLE_MIN_SIDE_PX} (`ФОК-Ф-04`). */
function normalizedCropSampleSize(ratio: number): { widthPx: number; heightPx: number } {
  let width = ratio >= 1 ? CROP_SAMPLE_MAX_SIDE_PX : CROP_SAMPLE_MAX_SIDE_PX * ratio;
  let height = ratio >= 1 ? CROP_SAMPLE_MAX_SIDE_PX / ratio : CROP_SAMPLE_MAX_SIDE_PX;
  if (width < CROP_SAMPLE_MIN_SIDE_PX) {
    height *= CROP_SAMPLE_MIN_SIDE_PX / width;
    width = CROP_SAMPLE_MIN_SIDE_PX;
  }
  if (height < CROP_SAMPLE_MIN_SIDE_PX) {
    width *= CROP_SAMPLE_MIN_SIDE_PX / height;
    height = CROP_SAMPLE_MIN_SIDE_PX;
  }
  return { widthPx: Math.round(width), heightPx: Math.round(height) };
}

/**
 * Визуальный редактор раскладки закреплённых новостей (`stream.Front#118`,
 * переработан под общий набор закреплённых новостей — `pinned-grid-rework`).
 *
 * **Набор закреплённых новостей — ОБЩИЙ между `small`/`large`** (прямое
 * решение пользователя «закрепил один раз — появилось в обеих раскладках»):
 * стиль (`PinnedNewsCardStyle`) хранится ОДИН раз на новость (`pinnedMeta`,
 * вычисляется из слотов ОБЕИХ раскладок — какая из
 * них первой встретит `newsId`, у той и берётся, они обязаны совпадать) —
 * позиция (`colStart`/`rowStart`/`colSpan`/`rowSpan`) — своя на каждую
 * раскладку.
 *
 * **Размещение — всегда явное действие администратора** (`РАС-Ф-02`,
 * `stream.Front#128`) — редактор больше НЕ занимает свободную ячейку во
 * второй раскладке сам и не расширяет под новость сетку: закрепив новость,
 * админ размещает её в ТЕКУЩЕЙ раскладке (drag-прямоугольник), а вторую
 * наполняет, переключившись на неё и разместив там отдельно.
 * `placedViewportsByNewsId` — passive-индикатор (`РАС-Ф-05`), в каких
 * раскладках новость УЖЕ размещена по-настоящему: подсказка, а не запрет,
 * ничего не блокирует и не размещает сама. Список закреплённых новостей
 * (`pinnedNewsList`) с этими бейджами и кнопкой «Разместить здесь» для
 * недостающей раскладки — единственный способ добавить новость во вторую
 * раскладку, кроме переключения и обычного добавления заново.
 *
 * **Два состояния холста на раскладку, не выбор устройства** (`РАБ-Ф-01`,
 * `РАБ-Ф-02`, `РАБ-Ф-07`, `РАБ-Ф-08`, `stream.Front#128`) — `viewportPreset`
 * переключается напрямую (`small`/`large`, ровно то же, что видит
 * посетитель), `density` — между просторным (эталон) и тесным (самый узкий
 * экран, где раскладка у посетителя ещё показывается) краями
 * (`PINNED_GRID_CANVAS_SCREENS`, `pinned-grid-geometry.ts`). Список типовых
 * устройств и поле произвольного размера убраны целиком — third variant не
 * предусмотрен.
 *
 * **Focal point — у картинки, не у слота** (`pinned-grid-rework`) — пикер
 * (`FocalPointPicker`) встроен в drawer редактирования карточки, на месте
 * бывших ползунков зума/пана; сохраняется отдельным запросом
 * (`AdminNewsService.updateImageFocalPoint()`), не через «Сохранить»
 * раскладки — влияет на все места, где эта картинка показывается.
 * `focalOverrides` — локальный оптимистичный кэш применённых точек (по `id`
 * картинки), пока родитель не перезагрузит `news()` с backend. Образцы
 * кадрирования (`editingCropSamples`) берутся из РЕАЛЬНЫХ форм ячеек этой
 * новости в обеих раскладках (`ФОК-Ф-04`), а не из отвлечённого набора
 * фиксированных пропорций.
 *
 * **Обложка — тем же приёмом** (`stream.Front#132`, `РЕД-О-02`): `CoverPicker`
 * в том же drawer'е меняет обложку сразу, отдельным `AdminNewsService.update()`,
 * не по общему «Сохранить» стиля — обложка свойство новости, а не пина, и её
 * смена здесь действует везде, где новость показывается, о чём рядом с
 * пикером есть текст-предупреждение. `coverOverrides` — тот же оптимистичный
 * кэш, что `focalOverrides`, но по `newsId`; `pendingCoverType` держит выбор
 * типа обложки, для которого ещё не выбрана картинка/файл, — на сервер он не
 * уходит (провалил бы валидацию `AdminNewsService.update()`).
 *
 * **Режим подложки виден и на холсте** (`РАБ-Ф-09`, `РАБ-Ф-10`) — холст
 * рендерит тот же `NewsCard`, что и публичная страница, поэтому переход
 * автоматический; `#previewCard.quiltReason()` читается через template ref
 * (не `protected` — Angular не даёт видеть `protected`-члены чужого
 * компонента) и превращается в подсказку через `quiltReasonLabel()`.
 *
 * Отдельного iframe-предпросмотра «как у посетителя» больше нет
 * (`Принятые решения`, `specs/02-admin/05-pinned/spec.md`) — прямой
 * переключатель раскладки/состояния холста показывает то же самое
 * напрямую, без второго дублирующего вида.
 *
 * Остальное — без изменений (`stream.Front#118`): драг/ресайз/добавление —
 * голые Pointer Events, размер сетки/подсветка — та же механика, что раньше.
 */
@Component({
  selector: 'app-pinned-grid-editor',
  imports: [Button, ButtonGroup, Select, DrawerModule, NewsCard, FocalPointPicker, CoverPicker],
  templateUrl: './pinned-grid-editor.html',
  styleUrl: './pinned-grid-editor.scss',
})
export class PinnedGridEditor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);
  private readonly adminNewsService = inject(AdminNewsService);

  readonly news = input.required<NewsItem[]>();
  readonly layouts = input.required<Record<PinnedGridViewport, PinnedGridLayout>>();
  readonly save = output<Record<PinnedGridViewport, PinnedGridLayout>>();

  protected readonly emptyTags: NewsTag[] = [];
  protected readonly imagePositionOptions = IMAGE_POSITION_OPTIONS;
  protected readonly viewportToggleOptions = VIEWPORT_TOGGLE_OPTIONS;
  protected readonly densityToggleOptions = DENSITY_TOGGLE_OPTIONS;
  protected readonly pinnedGridViewports = PINNED_GRID_VIEWPORTS;

  protected readonly localLayouts = linkedSignal<Record<PinnedGridViewport, PinnedGridLayout>>(() =>
    this.layouts(),
  );
  protected readonly dragState = signal<DragState | null>(null);

  protected readonly gridHighlightEnabled = signal(false);

  /** Прямой переключатель раскладки (`РАБ-Ф-01`, `РАБ-Ф-02`) — не выводится из размера экрана, задаётся явно. */
  protected readonly viewportPreset = signal<PinnedGridViewport>('large');
  /** Просторное/тесное состояние холста ТЕКУЩЕЙ раскладки (`РАБ-Ф-07`, `РАБ-Ф-08`). */
  protected readonly density = signal<PinnedGridCanvasDensity>('reference');

  /** `id` картинки → применённая (но ещё не отражённая в `news()`) точка фокуса, оптимистичный локальный кэш для `FocalPointPicker`. */
  private readonly focalOverrides = signal<Record<string, FocalPoint | null>>({});

  /** `newsId` → применённая (но ещё не отражённая в `news()`) обложка, тот же оптимистичный приём, что `focalOverrides` — для `CoverPicker` (`stream.Front#132`, `РЕД-О-02`). */
  private readonly coverOverrides = signal<Record<string, NewsCover>>({});
  /** Тип обложки выбран в `CoverPicker`, но конкретная картинка/файл — ещё нет: держим локально, на сервер не отправляем (`{type, url: null}` не пройдёт валидацию бэка для `image`/`custom`). Сбрасывается при смене редактируемой новости и на каждый реальный коммит. */
  private readonly pendingCoverType = signal<CoverPickerType | null>(null);

  /** Реальный размер экрана холста — одно из двух состояний ТЕКУЩЕЙ раскладки (`РАБ-Ф-01`…`РАБ-Ф-08`), не выбор устройства/произвольный ввод. */
  protected readonly screenSize = computed<{ width: number; height: number }>(
    () => PINNED_GRID_CANVAS_SCREENS[this.viewportPreset()][this.density()],
  );

  /** Реальная площадь под сетку на странице `/news` для `screenSize()` — см. `computePinnedGridAreaSize()`. */
  protected readonly gridAreaSize = computed<GridAreaSize>(() =>
    computePinnedGridAreaSize(this.screenSize().width, this.screenSize().height),
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
          result[slot.newsId] = { style: slot.style };
        }
      }
    }
    return result;
  });

  /**
   * Текущая раскладка — РЕАЛЬНЫЕ слоты `localLayouts()`, без авто-заполнения
   * (`РАС-Ф-02`, `stream.Front#128`): новость, закреплённая, но не
   * размещённая явно в этой раскладке, здесь просто отсутствует — админ
   * видит её в `pinnedNewsList` и размещает сам, когда решит. Осиротевшие
   * слоты (`newsId` без соответствующей новости в `news()`) отфильтровываются
   * — та же гигиена, что раньше делала `reconciled()`, без автозаполнения.
   */
  protected readonly currentLayout = computed(() => {
    const layout = this.localLayouts()[this.viewportPreset()];
    const existing = this.existingNewsIds();
    return {
      config: layout.config,
      slots: layout.slots.filter((slot) => existing.has(slot.newsId)),
    };
  });
  protected readonly localGridConfig = computed(() => this.currentLayout().config);
  protected readonly localSlots = computed(() => this.currentLayout().slots);

  /** В каких раскладках закреплённая новость РЕАЛЬНО размещена сейчас (`РАС-Ф-05`) — passive-индикатор для `pinnedNewsList`, не блокирует ни сохранение, ни что-либо ещё. */
  private readonly placedViewportsByNewsId = computed<Record<string, PinnedGridViewport[]>>(() => {
    const layouts = this.localLayouts();
    const existing = this.existingNewsIds();
    const result: Record<string, PinnedGridViewport[]> = {};
    for (const viewport of PINNED_GRID_VIEWPORTS) {
      for (const slot of layouts[viewport].slots) {
        if (!existing.has(slot.newsId)) {
          continue;
        }
        (result[slot.newsId] ??= []).push(viewport);
      }
    }
    return result;
  });

  /** Все закреплённые новости (`pinnedMeta`) с их статусом размещения по раскладкам — питает панель `pinned-grid-editor__placement-status` (`РАС-Ф-05`). */
  protected readonly pinnedNewsList = computed(() => {
    const meta = this.pinnedMeta();
    const placed = this.placedViewportsByNewsId();
    const newsById = new Map(this.news().map((item) => [item.id, item]));
    const result: { newsId: string; item: NewsItem; placedIn: PinnedGridViewport[] }[] = [];
    for (const newsId of Object.keys(meta)) {
      const item = newsById.get(newsId);
      if (item) {
        result.push({ newsId, item, placedIn: placed[newsId] ?? [] });
      }
    }
    return result;
  });

  protected readonly columnsDraft = linkedSignal(() => this.localGridConfig().columns);
  protected readonly rowsDraft = linkedSignal(() => this.localGridConfig().rows);

  protected readonly addDrawerVisible = signal(false);
  protected readonly addFormNewsId = signal<string | null>(null);
  protected readonly pendingNews = signal<PendingNews | null>(null);
  protected readonly placementDrag = signal<PlacementDrag | null>(null);

  protected readonly editingNewsId = signal<string | null>(null);
  protected readonly draftStyle = signal<PinnedNewsCardStyle | null>(null);

  protected readonly editingSlot = computed(() => {
    const newsId = this.editingNewsId();
    return newsId ? (this.localSlots().find((slot) => slot.newsId === newsId) ?? null) : null;
  });

  /**
   * Картинка, для которой показан `FocalPointPicker` в drawer'е
   * редактирования, — **обложка новости**, если она взята из её набора
   * (`stream.Front#137`). Прежний откат на первую картинку убран: у новости
   * без обложки кадрировать нечего, а своя обложка (`custom`) в наборе не
   * лежит и правится не отсюда.
   */
  protected readonly editingFocalImage = computed(() => {
    const newsId = this.editingNewsId();
    if (!newsId) {
      return null;
    }
    const item = this.news().find((entry) => entry.id === newsId);
    if (!item) {
      return null;
    }
    const cover = this.coverOverrides()[newsId] ?? item.cover;
    if (!cover.url) {
      return null;
    }
    return item.images.find((entry) => entry.url === cover.url) ?? null;
  });

  /**
   * Значение `CoverPicker` для новости, которую сейчас редактируют
   * (`stream.Front#132`) — применённый оптимистичный оверлей
   * (`coverOverrides`), если есть, иначе обложка самой новости; поверх —
   * выбранный, но ещё не подтверждённый конкретной картинкой/файлом тип
   * (`pendingCoverType`), чтобы `CoverPicker` успел показать галерею/загрузку
   * до первого реального клика.
   */
  protected readonly editingCoverValue = computed<CoverPickerValue>(() => {
    const newsId = this.editingNewsId();
    const pendingType = this.pendingCoverType();
    if (pendingType) {
      return { type: pendingType, url: null };
    }
    if (!newsId) {
      return { type: 'none', url: null };
    }
    const item = this.news().find((entry) => entry.id === newsId);
    if (!item) {
      return { type: 'none', url: null };
    }
    const cover = this.coverOverrides()[newsId] ?? item.cover;
    return { type: cover.type, url: cover.url };
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
    return image.focalX !== null && image.focalY !== null
      ? { x: image.focalX, y: image.focalY }
      : null;
  });

  /**
   * Образцы кадрирования для `FocalPointPicker` — РЕАЛЬНЫЕ формы ячеек этой
   * новости в обеих раскладках, где она сейчас размещена (`ФОК-Ф-04`), не
   * отвлечённый набор фиксированных пропорций. Соотношение сторон берётся на
   * эталонном экране каждой раскладки (`reference` — сама раскладка от
   * ширины экрана не зависит, только размер ячейки на нём, поэтому именно
   * эталон, а не текущее состояние холста).
   */
  protected readonly editingCropSamples = computed<FocalPointCropSample[]>(() => {
    const newsId = this.editingNewsId();
    if (!newsId) {
      return [];
    }
    const samples: FocalPointCropSample[] = [];
    for (const viewport of PINNED_GRID_VIEWPORTS) {
      const ratio = this.cellAspectRatioFor(viewport, newsId);
      if (ratio === null) {
        continue;
      }
      const label = viewport === 'large' ? 'Широкая' : 'Компактная';
      samples.push({ label, ...normalizedCropSampleSize(ratio) });
    }
    return samples;
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
      cover: NO_COVER,
      news: EMPTY_CONTENT,
    };
    const { columns, rows } = this.localGridConfig();
    return isSlotPlacementValid(candidate, this.localSlots(), columns, rows);
  });

  /**
   * Соотношение сторон (ширина/высота) реальной ячейки `newsId` в `viewport`
   * на ЭТАЛОННОМ экране этой раскладки — `null`, если новость там не
   * размещена (`editingCropSamples`, `ФОК-Ф-04`). На `small` высота холста
   * не фиксирована (`gridAreaSize().height === null`), поэтому строка берёт
   * тот же практический пол, что и сам холст редактора
   * (`EDITOR_SMALL_MIN_ROW_HEIGHT_PX`) — по нему считаются его же строки.
   */
  private cellAspectRatioFor(viewport: PinnedGridViewport, newsId: string): number | null {
    const layout = this.localLayouts()[viewport];
    const slot = layout.slots.find((item) => item.newsId === newsId);
    if (!slot) {
      return null;
    }
    const screen = PINNED_GRID_CANVAS_SCREENS[viewport].reference;
    const area = computePinnedGridAreaSize(screen.width, screen.height);
    const { columns, rows } = layout.config;
    const rowHeightPx =
      area.height !== null
        ? (area.height - GRID_GAP_PX * (rows - 1)) / rows
        : EDITOR_SMALL_MIN_ROW_HEIGHT_PX;
    const colWidthPx = (area.width - GRID_GAP_PX * (columns - 1)) / columns;
    const cellWidthPx = colWidthPx * slot.colSpan + GRID_GAP_PX * (slot.colSpan - 1);
    const cellHeightPx = rowHeightPx * slot.rowSpan + GRID_GAP_PX * (slot.rowSpan - 1);
    return cellWidthPx > 0 && cellHeightPx > 0 ? cellWidthPx / cellHeightPx : null;
  }

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
      cover: this.resolveCoverFor(newsId, news),
      news: this.resolveContentFor(newsId, news),
    };
  }

  /**
   * Содержимое карточки для локально построенного слота (`stream.Front#133`).
   * Редактор его не рисует — превью строится из собственного `NewsItem`
   * (`entry.item`), — и на сервер оно не уходит: `updateLayout()` урезает
   * слоты до `PinnedNewsPlacement`. Заполняется, чтобы локальный слот был
   * структурно тем же, что приходит с сервера.
   *
   * `tags` остаются пустыми: полных тем редактор не загружает, а `NewsItem`
   * несёт только их id.
   */
  private resolveContentFor(newsId: string, news: NewsItem[]): PinnedNewsContent {
    const item = news.find((entry) => entry.id === newsId);
    if (!item) {
      return EMPTY_CONTENT;
    }

    return {
      title: item.title,
      description: item.excerpt,
      publishedAt: item.publishedAt.toISOString(),
      viewCount: item.views,
      likeCount: item.likes,
      likedByCurrentUser: item.likedByCurrentUser,
      viewedByCurrentUser: item.viewedByCurrentUser,
      tags: [],
    };
  }

  /**
   * Обложка слота — обложка самой новости (`stream.Front#137`). Поверх неё
   * накладывается только несохранённая правка точки фокуса из этого же
   * редактора (`focalOverrides`), чтобы предпросмотр показывал то, что админ
   * двигает прямо сейчас.
   */
  private resolveCoverFor(newsId: string, news: NewsItem[]): NewsCover {
    const item = news.find((entry) => entry.id === newsId);
    if (!item) {
      return NO_COVER;
    }
    const cover = this.coverOverrides()[newsId] ?? item.cover;
    if (!cover.url) {
      return cover;
    }
    const image = item.images.find((entry) => entry.url === cover.url);
    const override = image ? this.focalOverrides()[image.id] : undefined;
    return override !== undefined ? { ...cover, focalPoint: override } : cover;
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

  protected onViewportChange(viewport: PinnedGridViewport | null): void {
    if (!viewport) {
      return;
    }
    this.viewportPreset.set(viewport);
  }

  protected onDensityChange(density: PinnedGridCanvasDensity | null): void {
    if (!density) {
      return;
    }
    this.density.set(density);
  }

  protected quiltReasonLabel(reason: Exclude<QuiltReason, null>): string {
    return QUILT_REASON_LABELS[reason];
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
    );
  }

  /** Смена новости прямо из drawer'а редактирования — в отличие от `onSlotNewsChange`, здесь ещё нужно перевести `editingNewsId` на новый id, иначе drawer "потеряет" редактируемый слот (ключ поиска — сам `newsId`, отдельного id у слота нет). */
  protected onEditFormNewsChange(oldNewsId: string, newNewsId: string | null): void {
    if (!newNewsId || newNewsId === oldNewsId) {
      return;
    }
    this.onSlotNewsChange(oldNewsId, newNewsId);
    this.editingNewsId.set(newNewsId);
    // Сброс выбора типа обложки — тот же приём, что раньше сбрасывал
    // `draftCoverImageUrl`: список изображений и текущая обложка теперь
    // принадлежат другой новости.
    this.pendingCoverType.set(null);
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
        item.newsId === slot.newsId
          ? { ...item, colSpan: item.rowSpan, rowSpan: item.colSpan }
          : item,
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
    // Сохраняется РЕАЛЬНОЕ состояние `localLayouts()` — только то, что админ
    // явно разместил в каждой раскладке (`РАС-Ф-02`), плюс та же гигиена
    // осиротевших слотов, что и `currentLayout`.
    const existing = this.existingNewsIds();
    const cleaned = {} as Record<PinnedGridViewport, PinnedGridLayout>;
    for (const viewport of PINNED_GRID_VIEWPORTS) {
      const layout = this.localLayouts()[viewport];
      cleaned[viewport] = {
        config: layout.config,
        slots: layout.slots.filter((slot) => existing.has(slot.newsId)),
      };
    }
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
        colStart: clamp(
          state.startSlot.colStart + deltaCol,
          1,
          columns - state.startSlot.colSpan + 1,
        ),
        rowStart: clamp(state.startSlot.rowStart + deltaRow, 1, rows - state.startSlot.rowSpan + 1),
      };
    } else if (state.kind === 'col') {
      candidate = {
        ...state.startSlot,
        colSpan: clamp(
          state.startSlot.colSpan + deltaCol,
          1,
          columns - state.startSlot.colStart + 1,
        ),
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
    this.addDrawerVisible.set(true);
  }

  protected onAddFormNewsChange(newsId: string | null): void {
    this.addFormNewsId.set(newsId);
  }

  protected onAddFormSubmit(): void {
    const newsId = this.addFormNewsId();
    if (!newsId) {
      return;
    }
    this.pendingNews.set({ newsId });
    this.addDrawerVisible.set(false);
  }

  /** Разместить в ТЕКУЩЕЙ раскладке новость, закреплённую, но здесь ещё не размещённую (`pinnedNewsList`, `РАС-Ф-05`) — тот же режим drag-прямоугольника, что и обычное добавление, только стиль уже есть (`pinnedMeta`) и не сбрасывается. */
  protected onPlaceInCurrentViewportClick(newsId: string): void {
    this.pendingNews.set({ newsId });
  }

  protected onCancelPlacement(): void {
    this.pendingNews.set(null);
    this.placementDrag.set(null);
  }

  protected onPlacementCellPointerDown(cell: GridCell): void {
    if (!this.pendingNews() || this.isCellOccupied(cell)) {
      return;
    }
    this.placementDrag.set({
      startCol: cell.col,
      startRow: cell.row,
      col: cell.col,
      row: cell.row,
    });

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
    );
    this.placementDrag.set(null);
    this.pendingNews.set(null);
  }

  protected onEditStyleClick(slot: PinnedNewsSlot): void {
    this.editingNewsId.set(slot.newsId);
    this.draftStyle.set(slot.style);
    this.pendingCoverType.set(null);
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
    this.adminNewsService
      .updateImageFocalPoint(image.id, { focalX: point?.x ?? null, focalY: point?.y ?? null })
      .subscribe({
        error: () => {
          this.focalOverrides.update((overrides) => ({ ...overrides, [image.id]: previous }));
          this.notificationService.show('Не удалось сохранить точку фокуса', 'error');
        },
      });
  }

  /**
   * `CoverPicker.valueChange` в drawer'е редактирования пина (`stream.Front#132`,
   * `РЕД-О-02`) — в отличие от стиля карточки, обложка НЕ копится в
   * `draftStyle` до «Сохранить»: она применяется сразу отдельным запросом,
   * тот же приём, что `onFocalPointChange`, — потому что она свойство
   * новости, а не пина, и меняет её показ везде, не только в этой раскладке
   * (предупреждение об этом — текст рядом с пикером в `.html`, не блокирующий
   * confirm на каждый клик).
   *
   * Тип выбран, но конкретная картинка/файл — ещё нет (`value.url === null`
   * при `type !== 'none'`) — на сервер такое состояние не проходит валидацию
   * (`AdminNewsService.update()` вернул бы 400), поэтому только держим тип
   * локально (`pendingCoverType`) и ждём следующего клика по миниатюре/
   * загрузки — тот придёт уже с `url`.
   */
  protected onCoverPickerChange(newsId: string, value: CoverPickerValue): void {
    if (value.type !== 'none' && value.url === null) {
      this.pendingCoverType.set(value.type);
      return;
    }
    this.pendingCoverType.set(null);

    const item = this.news().find((entry) => entry.id === newsId);
    if (!item) {
      return;
    }
    const previous = this.coverOverrides()[newsId] ?? item.cover;
    const optimistic: NewsCover = {
      type: value.type,
      url: value.url,
      focalPoint: this.focalPointForCoverImage(item, value),
      variants: this.variantsForCoverImage(item, value),
    };
    this.coverOverrides.update((overrides) => ({ ...overrides, [newsId]: optimistic }));
    this.adminNewsService
      .update(newsId, { cover: { type: value.type, url: value.url ?? undefined } })
      .subscribe({
        error: () => {
          this.coverOverrides.update((overrides) => ({ ...overrides, [newsId]: previous }));
          this.notificationService.show('Не удалось изменить обложку', 'error');
        },
      });
  }

  /** Обложка `image` наследует фокус САМОЙ картинки (`streamer.API#80`, `resolveNewsCover()`) — то же самое зеркалится здесь для оптимистичного превью, чтобы карточка не мигала центрированным кадром до ответа сервера. */
  private focalPointForCoverImage(item: NewsItem, value: CoverPickerValue): FocalPoint | null {
    if (value.type !== 'image' || !value.url) {
      return null;
    }
    const image = item.images.find((entry) => entry.url === value.url);
    return image && image.focalX !== null && image.focalY !== null
      ? { x: image.focalX, y: image.focalY }
      : null;
  }

  /** Обложка `image` наследует и размерные варианты самой картинки (`streamer.API#78`/`stream.Front#130`) — тот же приём, что `focalPointForCoverImage()`, чтобы оптимистичное превью сразу выбирало вариант по месту, не оригинал целиком до ответа сервера. */
  private variantsForCoverImage(item: NewsItem, value: CoverPickerValue): readonly ImageVariant[] {
    if (value.type !== 'image' || !value.url) {
      return [];
    }
    return item.images.find((entry) => entry.url === value.url)?.variants ?? [];
  }

  protected onSaveStyleClick(): void {
    const newsId = this.editingNewsId();
    const style = this.draftStyle();
    if (!newsId || !style) {
      return;
    }
    this.applyMetaToNews(newsId, style);
    this.editingNewsId.set(null);
    this.draftStyle.set(null);
    this.pendingCoverType.set(null);
  }

  protected onCancelStyleClick(): void {
    this.editingNewsId.set(null);
    this.draftStyle.set(null);
    this.pendingCoverType.set(null);
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
        next[viewport] = {
          ...next[viewport],
          slots: next[viewport].slots.filter((slot) => slot.newsId !== newsId),
        };
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
  ): void {
    this.updateCurrentSlots((slots) => [
      ...slots,
      this.buildSlot(newsId, colStart, rowStart, colSpan, rowSpan, { style }, this.news()),
    ]);
  }

  /** Переносит новый стиль во ВСЕ слоты этой новости во ВСЕХ раскладках, где она РЕАЛЬНО размещена (`РЕД-О-02`) — виртуальных больше нет, переносить в несуществующий слот не на что. */
  private applyMetaToNews(newsId: string, style: PinnedNewsCardStyle): void {
    const layouts = this.localLayouts();
    const news = this.news();
    this.localLayouts.update(() => {
      const next = {} as Record<PinnedGridViewport, PinnedGridLayout>;
      for (const viewport of PINNED_GRID_VIEWPORTS) {
        next[viewport] = {
          config: layouts[viewport].config,
          slots: layouts[viewport].slots.map((slot) =>
            slot.newsId === newsId
              ? this.buildSlot(
                  newsId,
                  slot.colStart,
                  slot.rowStart,
                  slot.colSpan,
                  slot.rowSpan,
                  { style },
                  news,
                )
              : slot,
          ),
        };
      }
      return next;
    });
  }
}
