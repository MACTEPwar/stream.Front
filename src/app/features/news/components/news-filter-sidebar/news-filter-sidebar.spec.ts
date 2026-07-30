import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NewsTag } from '../../models/news-tag.model';
import { NewsTagService } from '../../services/news-tag.service';
import { NewsFilter, NewsFilterSidebar } from './news-filter-sidebar';

const TAGS: NewsTag[] = [
  { id: 'tournament', name: 'Турнир', severity: 'danger' },
  { id: 'announcement', name: 'Анонс', color: '#d4b106' },
  { id: 'stream', name: 'Стрим', severity: 'success' },
];

@Component({
  selector: 'app-news-filter-sidebar-host',
  imports: [NewsFilterSidebar],
  template: `<app-news-filter-sidebar (filterChange)="onFilterChange($event)" />`,
})
class NewsFilterSidebarHost {
  readonly lastFilter = signal<NewsFilter | null>(null);

  onFilterChange(filter: NewsFilter): void {
    this.lastFilter.set(filter);
  }
}

describe('NewsFilterSidebar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewsFilterSidebarHost],
      providers: [{ provide: NewsTagService, useValue: { getTags: () => of(TAGS) } }],
    });
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(NewsFilterSidebarHost);
    fixture.detectChanges();
    const sidebar = fixture.debugElement.children[0].componentInstance as NewsFilterSidebar;
    return { fixture, sidebar };
  }

  it('индикатор периода не рендерится, если период не задан', () => {
    const { fixture } = createSidebar();
    expect(fixture.nativeElement.querySelector('.news-filter-sidebar__period')).toBeNull();
  });

  it('бейдж не рендерится при 0 выбранных тегов', () => {
    const { fixture } = createSidebar();
    expect(fixture.nativeElement.querySelector('p-overlay-badge')).toBeNull();
  });

  it('черновик изменений не влияет на applied-состояние (индикатор/бейдж) без "Применить"', () => {
    const { fixture, sidebar } = createSidebar();

    sidebar['open']();
    sidebar['draft'].toggleTag('tournament', true);
    sidebar['draft'].leftValue.set(new Date(2026, 6, 1));
    fixture.detectChanges();

    expect(sidebar['tagBadgeValue']()).toBeUndefined();
    expect(sidebar['periodLabel']()).toBeNull();
  });

  it('закрытие сайдбара без "Применить" отбрасывает черновик — следующее открытие показывает старое applied-состояние', () => {
    const { sidebar } = createSidebar();

    sidebar['open']();
    sidebar['draft'].toggleTag('tournament', true);
    sidebar['visible'].set(false);

    sidebar['open']();

    expect(sidebar['draft'].selectedTagIds().size).toBe(0);
    expect(sidebar['draft'].leftValue()).toBeNull();
  });

  it('"Применить" коммитит черновик в applied-состояние, эмитит filterChange и закрывает сайдбар', () => {
    const { fixture, sidebar } = createSidebar();

    sidebar['open']();
    sidebar['draft'].toggleTag('tournament', true);
    const dateFrom = new Date(2026, 6, 30);
    sidebar['draft'].leftValue.set(dateFrom);
    sidebar['apply']();
    fixture.detectChanges();

    expect(sidebar['visible']()).toBe(false);
    expect(sidebar['tagBadgeValue']()).toBe(1);
    expect(sidebar['periodLabel']()).toBe('30.07.2026');
    expect(fixture.componentInstance.lastFilter()).toEqual({
      dateFrom,
      dateTo: null,
      tags: ['tournament'],
    });
  });

  it('период с обеими датами форматируется как диапазон', () => {
    const { sidebar } = createSidebar();

    sidebar['open']();
    sidebar['draft'].leftValue.set(new Date(2026, 6, 30));
    sidebar['draft'].rightValue.set(new Date(2026, 7, 5));
    sidebar['apply']();

    expect(sidebar['periodLabel']()).toBe('30.07.2026 – 05.08.2026');
  });

  it('"Очистить" сбрасывает applied-состояние и эмитит пустой filterChange', () => {
    const { fixture, sidebar } = createSidebar();

    sidebar['open']();
    sidebar['draft'].toggleTag('tournament', true);
    sidebar['draft'].leftValue.set(new Date(2026, 6, 1));
    sidebar['apply']();

    sidebar['open']();
    sidebar['clear']();
    fixture.detectChanges();

    expect(sidebar['visible']()).toBe(false);
    expect(sidebar['tagBadgeValue']()).toBeUndefined();
    expect(sidebar['periodLabel']()).toBeNull();
    expect(fixture.componentInstance.lastFilter()).toEqual({
      dateFrom: null,
      dateTo: null,
      tags: [],
    });
  });
});
