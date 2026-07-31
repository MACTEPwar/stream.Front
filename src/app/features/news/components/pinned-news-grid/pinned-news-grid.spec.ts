import { TestBed } from '@angular/core/testing';

import { NewsItem } from '../../models/news.model';
import { PinnedNewsSlot } from '../../models/pinned-news-slot.model';
import { PinnedNewsGrid, PinnedNewsGridEntry } from './pinned-news-grid';

function newsItem(id: string): NewsItem {
  return {
    id,
    title: `Заголовок ${id}`,
    excerpt: 'Lorem ipsum dolor sit amet consectetur.',
    imageUrl: null,
    tagIds: [],
    views: 10,
    likes: 5,
    publishedAt: new Date(2023, 11, 6),
    viewedByCurrentUser: false,
    likedByCurrentUser: false,
  };
}

function slot(overrides: Partial<PinnedNewsSlot> = {}): PinnedNewsSlot {
  return { newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, ...overrides };
}

describe('PinnedNewsGrid', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PinnedNewsGrid] });
  });

  function createGrid(entries: PinnedNewsGridEntry[]) {
    const fixture = TestBed.createComponent(PinnedNewsGrid);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture;
  }

  it('рендерит карточку на каждую запись', () => {
    const entries: PinnedNewsGridEntry[] = [
      { item: newsItem('news-1'), tags: [], slot: slot({ newsId: 'news-1' }) },
      { item: newsItem('news-2'), tags: [], slot: slot({ newsId: 'news-2', colStart: 2 }) },
    ];

    const fixture = createGrid(entries);
    expect(fixture.nativeElement.querySelectorAll('app-news-card').length).toBe(2);
  });

  it('ставит grid-column/grid-row по координатам слота', () => {
    const entries: PinnedNewsGridEntry[] = [
      { item: newsItem('news-1'), tags: [], slot: slot({ colStart: 2, rowStart: 3, colSpan: 2, rowSpan: 4 }) },
    ];

    const fixture = createGrid(entries);
    const card = fixture.nativeElement.querySelector('app-news-card') as HTMLElement;

    expect(card.style.gridColumn).toBe('2 / span 2');
    expect(card.style.gridRow).toBe('3 / span 4');
  });

  it('без записей рендерит пустое состояние', () => {
    const fixture = createGrid([]);
    expect(fixture.nativeElement.querySelector('.pinned-news-grid__empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-news-card').length).toBe(0);
  });
});
