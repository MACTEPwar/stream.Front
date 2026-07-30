/** Размер концептуальной сетки закреплённых новостей (`stream.Front#112`). */
export const PINNED_GRID_COLUMNS = 3;
export const PINNED_GRID_ROWS = 12;

/**
 * Позиция/размер одной закреплённой новости в сетке `PINNED_GRID_COLUMNS` ×
 * `PINNED_GRID_ROWS` на левой части страницы «Новости» (`stream.Front#112`).
 * Явные координаты, а не auto-placement — расположение в будущем настраивает
 * админ через ещё не существующую админку; сейчас это только
 * "предзаполненные" мок-данные (`NewsService.getPinnedSlots()`), как будто
 * админ их уже расставил.
 */
export interface PinnedNewsSlot {
  readonly newsId: string;
  readonly colStart: 1 | 2 | 3;
  readonly rowStart: number;
  readonly colSpan: number;
  readonly rowSpan: number;
}

/**
 * Проверяет, что каждый слот лежит в границах сетки и что никакие два слота
 * не занимают одну и ту же ячейку. Возвращает список текстов ошибок (пустой
 * массив — валидно), а не `boolean` — чтобы при нарушении сразу было видно,
 * какой слот и почему (пригодится будущей админке для валидации ввода).
 */
export function validatePinnedNewsSlots(slots: readonly PinnedNewsSlot[]): string[] {
  const errors: string[] = [];
  const occupiedBy = new Map<string, string>();

  for (const slot of slots) {
    if (slot.colStart < 1 || slot.colStart > PINNED_GRID_COLUMNS) {
      errors.push(`Слот «${slot.newsId}»: colStart=${slot.colStart} вне границ 1..${PINNED_GRID_COLUMNS}`);
    }
    if (slot.rowStart < 1 || slot.rowStart > PINNED_GRID_ROWS) {
      errors.push(`Слот «${slot.newsId}»: rowStart=${slot.rowStart} вне границ 1..${PINNED_GRID_ROWS}`);
    }

    const colEnd = slot.colStart + slot.colSpan - 1;
    if (colEnd > PINNED_GRID_COLUMNS) {
      errors.push(
        `Слот «${slot.newsId}»: colSpan=${slot.colSpan} выходит за правый край сетки (до колонки ${colEnd})`,
      );
    }

    const rowEnd = slot.rowStart + slot.rowSpan - 1;
    if (rowEnd > PINNED_GRID_ROWS) {
      errors.push(`Слот «${slot.newsId}»: rowSpan=${slot.rowSpan} выходит за нижний край сетки (до строки ${rowEnd})`);
    }

    for (let col = Math.max(slot.colStart, 1); col <= Math.min(colEnd, PINNED_GRID_COLUMNS); col++) {
      for (let row = Math.max(slot.rowStart, 1); row <= Math.min(rowEnd, PINNED_GRID_ROWS); row++) {
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
