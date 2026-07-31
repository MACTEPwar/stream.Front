import { NewsService } from '../services/news.service';
import { PINNED_GRID_COLUMNS, PINNED_GRID_ROWS, PinnedNewsSlot, validatePinnedNewsSlots } from './pinned-news-slot.model';

function slot(overrides: Partial<PinnedNewsSlot> = {}): PinnedNewsSlot {
  return { newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, ...overrides };
}

describe('validatePinnedNewsSlots', () => {
  it('валидные непересекающиеся слоты не дают ошибок', () => {
    const errors = validatePinnedNewsSlots([
      slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 2 }),
      slot({ newsId: 'news-2', colStart: 2, rowStart: 1, colSpan: 2, rowSpan: 1 }),
    ]);

    expect(errors).toEqual([]);
  });

  it('colStart вне 1..PINNED_GRID_COLUMNS — ошибка', () => {
    const errors = validatePinnedNewsSlots([{ ...slot(), colStart: 0 } as unknown as PinnedNewsSlot]);
    expect(errors.some((error) => error.includes('colStart'))).toBe(true);
  });

  it('rowStart вне 1..PINNED_GRID_ROWS — ошибка', () => {
    const errors = validatePinnedNewsSlots([slot({ rowStart: PINNED_GRID_ROWS + 1 })]);
    expect(errors.some((error) => error.includes('rowStart'))).toBe(true);
  });

  it('colSpan выводит слот за правый край сетки — ошибка', () => {
    const errors = validatePinnedNewsSlots([slot({ colStart: PINNED_GRID_COLUMNS, colSpan: 2 })]);
    expect(errors.some((error) => error.includes('colSpan'))).toBe(true);
  });

  it('rowSpan выводит слот за нижний край сетки — ошибка', () => {
    const errors = validatePinnedNewsSlots([slot({ rowStart: PINNED_GRID_ROWS, rowSpan: 2 })]);
    expect(errors.some((error) => error.includes('rowSpan'))).toBe(true);
  });

  it('пересечение двух слотов по занимаемым ячейкам — ошибка', () => {
    const errors = validatePinnedNewsSlots([
      slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2 }),
      slot({ newsId: 'news-2', colStart: 2, rowStart: 2, colSpan: 2, rowSpan: 2 }),
    ]);

    expect(errors.some((error) => error.includes('пересекаются'))).toBe(true);
  });

  it('реальные моковые слоты (NewsService.getPinnedSlots) валидны — защита от регрессии', () => {
    let slots: PinnedNewsSlot[] = [];
    new NewsService().getPinnedSlots().subscribe((value) => (slots = value));

    expect(validatePinnedNewsSlots(slots)).toEqual([]);
    expect(slots.length).toBeGreaterThan(0);
  });
});
