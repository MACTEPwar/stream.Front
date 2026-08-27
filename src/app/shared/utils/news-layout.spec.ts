import {
  NEWS_PAGE_GRID_REFERENCE_WIDTH_PX,
  NEWS_PAGE_SIDE_BY_SIDE_MIN_CONTENT_WIDTH_PX,
  isNewsArchiveBeside,
  newsArchiveGap,
  newsArchiveWidth,
  newsGridWidth,
  newsPageContentWidth,
} from './news-layout';

/**
 * Таблица из спеки НОВ (`РАЗ-Ф-01`…`РАЗ-Ф-04`, «Как правило выглядит на
 * конкретных экранах»). Отступы страницы — 60 с каждой стороны, то есть
 * пресет `large`. Числа здесь — не самостоятельные величины, а следствие
 * минимумов и эталонов: если правка какого-то минимума ломает эту таблицу,
 * пересчитывать нужно её, а не подгонять формулу.
 */
const SPEC_TABLE = [
  { screen: 1024, content: 904, archive: null, gap: null, grid: 904 },
  { screen: 1080, content: 960, archive: 440, gap: 20, grid: 500 },
  { screen: 1170, content: 1050, archive: 440, gap: 110, grid: 500 },
  { screen: 1280, content: 1160, archive: 440, gap: 110, grid: 610 },
  { screen: 1440, content: 1320, archive: 440, gap: 110, grid: 770 },
  { screen: 1700, content: 1580, archive: 440, gap: 110, grid: 1030 },
  { screen: 1920, content: 1800, archive: 660, gap: 110, grid: 1030 },
] as const;

describe('news-layout', () => {
  describe('производные величины', () => {
    it('ширина витрины на эталонном экране — остаток после ленты, а не отдельное число', () => {
      // 1920 − 2×60 − 660 − 110
      expect(NEWS_PAGE_GRID_REFERENCE_WIDTH_PX).toBe(1030);
    });

    it('порог «лента сбоку» — сумма минимумов ленты, зазора и витрины (РАЗ-Ф-03)', () => {
      // 440 + 20 + 500
      expect(NEWS_PAGE_SIDE_BY_SIDE_MIN_CONTENT_WIDTH_PX).toBe(960);
    });
  });

  describe('newsPageContentWidth', () => {
    it('вычитает паддинги страницы своего пресета', () => {
      expect(newsPageContentWidth(1440, 'large')).toBe(1320);
      expect(newsPageContentWidth(1024, 'small')).toBe(984);
    });

    it('перестаёт расти на пороге центрирования', () => {
      expect(newsPageContentWidth(2560, 'large')).toBe(1920);
    });
  });

  describe('таблица спеки', () => {
    for (const row of SPEC_TABLE) {
      it(`${row.screen}px — витрина ${row.grid}, лента ${row.archive ?? 'внизу'}`, () => {
        const content = newsPageContentWidth(row.screen, 'large');

        expect(content).toBe(row.content);
        expect(newsGridWidth(content)).toBe(row.grid);

        if (row.archive === null) {
          expect(isNewsArchiveBeside(content)).toBe(false);
          return;
        }

        expect(isNewsArchiveBeside(content)).toBe(true);
        expect(newsArchiveWidth(content)).toBe(row.archive);
        expect(newsArchiveGap(content)).toBe(row.gap);
      });
    }
  });

  describe('порядок уступок (РАЗ-Ф-01)', () => {
    it('сначала отдаёт лента: витрина держит эталон, пока лента не дошла до минимума', () => {
      // 1580 — точка, где лента как раз достигла минимума
      expect(newsGridWidth(1700)).toBe(NEWS_PAGE_GRID_REFERENCE_WIDTH_PX);
      expect(newsGridWidth(1580)).toBe(NEWS_PAGE_GRID_REFERENCE_WIDTH_PX);
      expect(newsArchiveWidth(1700)).toBe(560);
      expect(newsArchiveWidth(1580)).toBe(440);
    });

    it('затем отдаёт витрина, а лента и зазор стоят на своих значениях', () => {
      expect(newsArchiveWidth(1200)).toBe(440);
      expect(newsArchiveGap(1200)).toBe(110);
      expect(newsGridWidth(1200)).toBe(650);
    });

    it('зазор сжимается последним — только когда и лента, и витрина уже на нижних значениях (РАЗ-Ф-04)', () => {
      expect(newsArchiveGap(1050)).toBe(110);
      expect(newsArchiveGap(1000)).toBe(60);
      expect(newsArchiveGap(960)).toBe(20);
      // витрина при этом не проседает ниже достаточной
      expect(newsGridWidth(1000)).toBe(500);
      expect(newsGridWidth(960)).toBe(500);
    });

    it('и лишь после этого лента уходит вниз', () => {
      expect(isNewsArchiveBeside(960)).toBe(true);
      expect(isNewsArchiveBeside(959)).toBe(false);
    });
  });

  describe('лента внизу', () => {
    it('витрина получает всю ширину (РАЗ-Ф-02)', () => {
      expect(newsGridWidth(904)).toBe(904);
      expect(newsGridWidth(360)).toBe(360);
    });

    it('витрина при этом может быть уже достаточной — рядом с ней уже ничего не стоит', () => {
      expect(newsGridWidth(360)).toBeLessThan(500);
    });
  });

  describe('границы включительны', () => {
    it('ровно на пороге лента ещё сбоку', () => {
      expect(isNewsArchiveBeside(NEWS_PAGE_SIDE_BY_SIDE_MIN_CONTENT_WIDTH_PX)).toBe(true);
      expect(isNewsArchiveBeside(NEWS_PAGE_SIDE_BY_SIDE_MIN_CONTENT_WIDTH_PX - 1)).toBe(false);
    });
  });
});
