import { DEFAULT_CARD_STYLE, PinnedGridLayout, PinnedNewsSlot } from '../models/pinned-news-slot.model';
import { NewsService } from './news.service';

describe('NewsService', () => {
  it('updateLayout перезаписывает результат следующего getLayout — независимо для каждого вьюпорта', () => {
    const service = new NewsService();
    const newLayout: PinnedGridLayout = {
      config: { columns: 5, rows: 20 },
      slots: [{ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 3, rowSpan: 12, style: DEFAULT_CARD_STYLE, coverImageUrl: null }],
    };

    let updateResult: PinnedGridLayout | undefined;
    service.updateLayout('small', newLayout).subscribe((layout) => (updateResult = layout));
    expect(updateResult).toEqual(newLayout);

    let smallLayout: PinnedGridLayout | undefined;
    service.getLayout('small').subscribe((layout) => (smallLayout = layout));
    expect(smallLayout).toEqual(newLayout);

    // Другие вьюпорты не затронуты.
    let middleLayout: PinnedGridLayout | undefined;
    service.getLayout('middle').subscribe((layout) => (middleLayout = layout));
    expect(middleLayout).not.toEqual(newLayout);
  });

  it('getPinnedSlots/getGridConfig отдают раскладку пресета large (используется публичной NewsPage)', () => {
    const service = new NewsService();
    const newLayout: PinnedGridLayout = {
      config: { columns: 4, rows: 16 },
      slots: [{ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, style: DEFAULT_CARD_STYLE, coverImageUrl: null }],
    };
    service.updateLayout('large', newLayout).subscribe();

    let slots: PinnedNewsSlot[] = [];
    service.getPinnedSlots().subscribe((value) => (slots = value));
    expect(slots).toEqual(newLayout.slots);

    let config;
    service.getGridConfig().subscribe((value) => (config = value));
    expect(config).toEqual(newLayout.config);
  });
});
