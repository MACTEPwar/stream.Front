/**
 * Дефолтный размер сетки закреплённых новостей (`stream.Front#112`) — старт
 * для `PinnedGridConfig`. Сам размер сетки с `stream.Front#118` больше не
 * константа: админ может поменять кол-во строк/колонок через
 * `PinnedGridEditor` (`NewsService.updateGridConfig()`), реальная раскладка
 * (`PinnedNewsGrid`) читает актуальный `PinnedGridConfig`, а не эти дефолты.
 */
export const DEFAULT_GRID_COLUMNS = 3;
export const DEFAULT_GRID_ROWS = 12;

/** Актуальный размер сетки закреплённых новостей — `NewsService.getGridConfig()`/`updateGridConfig()`. */
export interface PinnedGridConfig {
  readonly columns: number;
  readonly rows: number;
}

/**
 * Три независимые раскладки — по одной на пресет вьюпорта симулятора
 * `PinnedGridEditor` (`stream.Front#118`, доработка, по прямому запросу
 * пользователя: "колонки и строки у каждого вьюпорта свои, так же как и
 * карточки новостей" — не одна сетка, визуально сжимающаяся под разные
 * экраны, а полноценный responsive-дизайн с отдельным размером сетки и
 * отдельной расстановкой карточек на каждый пресет). Выбор нужного пресета
 * для реального устройства посетителя на публичном сайте — вне рамок этой
 * задачи (`NewsPage` пока показывает только раскладку `'large'`, см.
 * `NewsService.getPinnedSlots()`/`getGridConfig()`).
 */
export type PinnedGridViewport = 'small' | 'middle' | 'large';

export const PINNED_GRID_VIEWPORTS: readonly PinnedGridViewport[] = ['small', 'middle', 'large'];

/** Размер сетки + расстановка карточек для ОДНОГО пресета вьюпорта (`PinnedGridViewport`) — `NewsService.getLayout()`/`updateLayout()`. */
export interface PinnedGridLayout {
  readonly config: PinnedGridConfig;
  readonly slots: PinnedNewsSlot[];
}

/** Сторона карточки, у которой рисуется картинка (`stream.Front#118`) — расширение исходного container-query-переключателя "сверху/слева" на все 4 стороны, админ выбирает явно, а не только по фактической форме ячейки. */
export type CardImagePosition = 'top' | 'right' | 'bottom' | 'left';

/**
 * Настройки отображения одной закреплённой карточки (`stream.Front#118`) —
 * админ управляет ими в inline-редакторе стиля карточки (`PinnedGridEditor`),
 * значения по умолчанию (`DEFAULT_CARD_STYLE`) воспроизводят исходное
 * поведение `NewsCard` (`stream.Front#112`) до появления этого редактора.
 */
export interface PinnedNewsCardStyle {
  readonly imagePosition: CardImagePosition;
  /** Доля площади карточки под картинку, 10..90 (%). */
  readonly imageSizePercent: number;
  /** Масштаб картинки внутри своей области, 1..3. */
  readonly imageScale: number;
  /** Смещение картинки по X, 0..100 (%, `object-position`). */
  readonly imageOffsetX: number;
  /** Смещение картинки по Y, 0..100 (%, `object-position`). */
  readonly imageOffsetY: number;
  readonly backgroundColor: string;
  readonly textColor: string;
}

export const DEFAULT_CARD_STYLE: PinnedNewsCardStyle = {
  imagePosition: 'top',
  imageSizePercent: 50,
  imageScale: 1,
  imageOffsetX: 50,
  imageOffsetY: 50,
  backgroundColor: '#f9f9f9',
  textColor: '#1e1e1e',
};

/**
 * Позиция/размер одной закреплённой новости в сетке `PinnedGridConfig` на
 * левой части страницы «Новости» (`stream.Front#112`). Явные координаты, а
 * не auto-placement — расположение настраивает админ через `PinnedGridEditor`
 * (`stream.Front#118`); сейчас это мок-данные (`NewsService.getPinnedSlots()`/
 * `updatePinnedSlots()`), как будто админ их уже расставил.
 *
 * `colStart`/`colSpan`/`rowStart`/`rowSpan` — обычный `number`, не литерал
 * (`1 | 2 | 3` было в `#112`, пока сетка была зафиксирована на 3 колонках) —
 * с динамическим размером сетки (`#118`) число колонок заранее не известно.
 */
export interface PinnedNewsSlot {
  readonly newsId: string;
  readonly colStart: number;
  readonly rowStart: number;
  readonly colSpan: number;
  readonly rowSpan: number;
  readonly style: PinnedNewsCardStyle;
  /** Обложка ЭТОГО пина (`stream.Front#118`, выбирается при добавлении карточки в `PinnedGridEditor`) — переопределяет `NewsItem.imageUrl` только для отображения в сетке; `null` — используется собственная картинка новости. */
  readonly coverImageUrl: string | null;
}

/**
 * Проверяет, что каждый слот лежит в границах сетки `columns`×`rows` и что
 * никакие два слота не занимают одну и ту же ячейку. Возвращает список
 * текстов ошибок (пустой массив — валидно), а не `boolean` — чтобы при
 * нарушении сразу было видно, какой слот и почему.
 */
export function validatePinnedNewsSlots(
  slots: readonly PinnedNewsSlot[],
  columns: number = DEFAULT_GRID_COLUMNS,
  rows: number = DEFAULT_GRID_ROWS,
): string[] {
  const errors: string[] = [];
  const occupiedBy = new Map<string, string>();

  for (const slot of slots) {
    if (slot.colStart < 1 || slot.colStart > columns) {
      errors.push(`Слот «${slot.newsId}»: colStart=${slot.colStart} вне границ 1..${columns}`);
    }
    if (slot.rowStart < 1 || slot.rowStart > rows) {
      errors.push(`Слот «${slot.newsId}»: rowStart=${slot.rowStart} вне границ 1..${rows}`);
    }

    const colEnd = slot.colStart + slot.colSpan - 1;
    if (colEnd > columns) {
      errors.push(`Слот «${slot.newsId}»: colSpan=${slot.colSpan} выходит за правый край сетки (до колонки ${colEnd})`);
    }

    const rowEnd = slot.rowStart + slot.rowSpan - 1;
    if (rowEnd > rows) {
      errors.push(`Слот «${slot.newsId}»: rowSpan=${slot.rowSpan} выходит за нижний край сетки (до строки ${rowEnd})`);
    }

    for (let col = Math.max(slot.colStart, 1); col <= Math.min(colEnd, columns); col++) {
      for (let row = Math.max(slot.rowStart, 1); row <= Math.min(rowEnd, rows); row++) {
        const cellKey = `${col}:${row}`;
        const occupant = occupiedBy.get(cellKey);
        if (occupant) {
          errors.push(`Слоты «${occupant}» и «${slot.newsId}» пересекаются в ячейке [${col}, ${row}]`);
        } else {
          occupiedBy.set(cellKey, slot.newsId);
        }
      }
    }
  }

  return errors;
}

/**
 * Быстрая live-проверка для `PinnedGridEditor` (`stream.Front#118`) во время
 * drag/resize/переориентации/добавления: помещается ли `candidate` в границы
 * сетки `columns`×`rows` и не пересекается ли с `otherSlots` (уже без самого
 * перетаскиваемого слота — вызывающая сторона исключает его из `otherSlots`
 * сама). Тонкая обёртка над {@link validatePinnedNewsSlots}, а не отдельная
 * копия проверок.
 */
export function isSlotPlacementValid(
  candidate: PinnedNewsSlot,
  otherSlots: readonly PinnedNewsSlot[],
  columns: number = DEFAULT_GRID_COLUMNS,
  rows: number = DEFAULT_GRID_ROWS,
): boolean {
  return validatePinnedNewsSlots([candidate, ...otherSlots], columns, rows).length === 0;
}

/** Результат {@link computeGridResizeImpact} — что случится со слотами при применении нового размера сетки. */
export interface GridResizeImpact {
  /** Слоты после применения нового размера — обрезанные по границам там, где потребовалось, без сдвига `colStart`/`rowStart`. */
  readonly updatedSlots: PinnedNewsSlot[];
  /** `newsId` слотов, у которых `colSpan`/`rowSpan` пришлось уменьшить, чтобы уместиться в новые границы. */
  readonly clippedNewsIds: string[];
  /** `newsId` слотов, которые не помещаются в новые границы вообще (их `colStart`/`rowStart` уже за пределами) — будут удалены. */
  readonly removedNewsIds: string[];
}

/**
 * Считает, что произойдёт с текущими слотами при смене размера сетки на
 * `newColumns`×`newRows` (`PinnedGridEditor`, `stream.Front#118`) — админ
 * явно попросил НЕ смещать позицию карточек (`colStart`/`rowStart` не
 * трогаются) и не удалять их без необходимости: если слот выходит за новые
 * границы только своим `colSpan`/`rowSpan`, он обрезается (span уменьшается
 * ровно настолько, чтобы уместиться); если уже сам `colStart`/`rowStart`
 * оказался за пределами новой сетки — обрезка невозможна, слот идёт в
 * `removedNewsIds`. Чистая функция — `PinnedGridEditor` показывает её
 * результат в `ConfirmModal` перед применением нового размера (при
 * уменьшении), а не молча меняет раскладку.
 */
export function computeGridResizeImpact(
  slots: readonly PinnedNewsSlot[],
  newColumns: number,
  newRows: number,
): GridResizeImpact {
  const updatedSlots: PinnedNewsSlot[] = [];
  const clippedNewsIds: string[] = [];
  const removedNewsIds: string[] = [];

  for (const slot of slots) {
    if (slot.colStart > newColumns || slot.rowStart > newRows) {
      removedNewsIds.push(slot.newsId);
      continue;
    }

    const clampedColSpan = Math.min(slot.colSpan, newColumns - slot.colStart + 1);
    const clampedRowSpan = Math.min(slot.rowSpan, newRows - slot.rowStart + 1);

    if (clampedColSpan !== slot.colSpan || clampedRowSpan !== slot.rowSpan) {
      clippedNewsIds.push(slot.newsId);
    }
    updatedSlots.push({ ...slot, colSpan: clampedColSpan, rowSpan: clampedRowSpan });
  }

  return { updatedSlots, clippedNewsIds, removedNewsIds };
}
