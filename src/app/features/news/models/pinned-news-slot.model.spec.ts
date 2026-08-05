import {
  DEFAULT_CARD_STYLE,
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  PinnedNewsSlot,
  computeGridResizeImpact,
  isSlotPlacementValid,
  validatePinnedNewsSlots,
} from './pinned-news-slot.model';

function slot(overrides: Partial<PinnedNewsSlot> = {}): PinnedNewsSlot {
  return {
    newsId: 'news-1',
    colStart: 1,
    rowStart: 1,
    colSpan: 1,
    rowSpan: 1,
    style: DEFAULT_CARD_STYLE,
    coverImageUrl: null,
    focalPoint: null,
    ...overrides,
  };
}

describe('validatePinnedNewsSlots', () => {
  it('валидные непересекающиеся слоты не дают ошибок', () => {
    const errors = validatePinnedNewsSlots([
      slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 2 }),
      slot({ newsId: 'news-2', colStart: 2, rowStart: 1, colSpan: 2, rowSpan: 1 }),
    ]);

    expect(errors).toEqual([]);
  });

  it('colStart вне 1..columns — ошибка', () => {
    const errors = validatePinnedNewsSlots([slot({ colStart: 0 })]);
    expect(errors.some((error) => error.includes('colStart'))).toBe(true);
  });

  it('rowStart вне 1..rows — ошибка', () => {
    const errors = validatePinnedNewsSlots([slot({ rowStart: DEFAULT_GRID_ROWS + 1 })]);
    expect(errors.some((error) => error.includes('rowStart'))).toBe(true);
  });

  it('colSpan выводит слот за правый край сетки — ошибка', () => {
    const errors = validatePinnedNewsSlots([slot({ colStart: DEFAULT_GRID_COLUMNS, colSpan: 2 })]);
    expect(errors.some((error) => error.includes('colSpan'))).toBe(true);
  });

  it('rowSpan выводит слот за нижний край сетки — ошибка', () => {
    const errors = validatePinnedNewsSlots([slot({ rowStart: DEFAULT_GRID_ROWS, rowSpan: 2 })]);
    expect(errors.some((error) => error.includes('rowSpan'))).toBe(true);
  });

  it('пересечение двух слотов по занимаемым ячейкам — ошибка', () => {
    const errors = validatePinnedNewsSlots([
      slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2 }),
      slot({ newsId: 'news-2', colStart: 2, rowStart: 2, colSpan: 2, rowSpan: 2 }),
    ]);

    expect(errors.some((error) => error.includes('пересекаются'))).toBe(true);
  });

  it('уважает переданные columns/rows, отличные от дефолта', () => {
    const errors = validatePinnedNewsSlots([slot({ colStart: 1, colSpan: 5 })], 5, DEFAULT_GRID_ROWS);
    expect(errors).toEqual([]);
  });

  it('раскладка сетки 3×12 из семи слотов без пропусков/пересечений валидна — защита от регрессии', () => {
    const slots: PinnedNewsSlot[] = [
      slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 7 }),
      slot({ newsId: 'news-2', colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 4 }),
      slot({ newsId: 'news-3', colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 4 }),
      slot({ newsId: 'news-4', colStart: 2, rowStart: 5, colSpan: 2, rowSpan: 4 }),
      slot({ newsId: 'news-5', colStart: 1, rowStart: 8, colSpan: 1, rowSpan: 5 }),
      slot({ newsId: 'news-6', colStart: 2, rowStart: 9, colSpan: 1, rowSpan: 4 }),
      slot({ newsId: 'news-7', colStart: 3, rowStart: 9, colSpan: 1, rowSpan: 4 }),
    ];

    expect(validatePinnedNewsSlots(slots, DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS)).toEqual([]);
  });
});

describe('isSlotPlacementValid', () => {
  it('кандидат в границах без пересечений — валиден', () => {
    const valid = isSlotPlacementValid(
      slot({ colStart: 1, rowStart: 1 }),
      [slot({ newsId: 'news-2', colStart: 2, rowStart: 1 })],
    );
    expect(valid).toBe(true);
  });

  it('кандидат выходит за правый край сетки — невалиден', () => {
    const valid = isSlotPlacementValid(slot({ colStart: 3, colSpan: 2 }), []);
    expect(valid).toBe(false);
  });

  it('кандидат пересекается с другим слотом — невалиден', () => {
    const valid = isSlotPlacementValid(
      slot({ colStart: 1, rowStart: 1 }),
      [slot({ newsId: 'news-2', colStart: 1, rowStart: 1 })],
    );
    expect(valid).toBe(false);
  });

  it('уважает переданные columns/rows', () => {
    const valid = isSlotPlacementValid(slot({ colStart: 4, colSpan: 1 }), [], 5, DEFAULT_GRID_ROWS);
    expect(valid).toBe(true);
  });
});

describe('computeGridResizeImpact', () => {
  it('увеличение сетки не трогает слоты', () => {
    const slots = [slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 3, rowSpan: 12 })];
    const impact = computeGridResizeImpact(slots, 5, 20);

    expect(impact.updatedSlots).toEqual(slots);
    expect(impact.clippedNewsIds).toEqual([]);
    expect(impact.removedNewsIds).toEqual([]);
  });

  it('уменьшение сетки обрезает span без сдвига colStart/rowStart', () => {
    const slots = [slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 3, rowSpan: 12 })];
    const impact = computeGridResizeImpact(slots, 2, 12);

    expect(impact.clippedNewsIds).toEqual(['news-1']);
    expect(impact.removedNewsIds).toEqual([]);
    expect(impact.updatedSlots[0]).toEqual(
      slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 12 }),
    );
  });

  it('слот, чей colStart/rowStart оказался за пределами новой сетки, помечается на удаление', () => {
    const slots = [slot({ newsId: 'news-1', colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 1 })];
    const impact = computeGridResizeImpact(slots, 2, DEFAULT_GRID_ROWS);

    expect(impact.removedNewsIds).toEqual(['news-1']);
    expect(impact.updatedSlots).toEqual([]);
  });
});
