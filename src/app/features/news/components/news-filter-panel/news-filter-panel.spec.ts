import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NewsTag } from '../../models/news-tag.model';
import { NewsTagService } from '../../services/news-tag.service';
import { NewsFilter, NewsFilterPanel } from './news-filter-panel';

const TAGS: NewsTag[] = [
  { id: 'tournament', name: 'Турнир', severity: 'danger' },
  { id: 'announcement', name: 'Анонс', color: '#d4b106' },
  { id: 'stream', name: 'Стрим', severity: 'success' },
];

@Component({
  selector: 'app-news-filter-panel-host',
  imports: [NewsFilterPanel],
  template: `<app-news-filter-panel (filterChange)="onFilterChange($event)" />`,
})
class NewsFilterPanelHost {
  readonly lastFilter = signal<NewsFilter | null>(null);

  onFilterChange(filter: NewsFilter): void {
    this.lastFilter.set(filter);
  }
}

describe('NewsFilterPanel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewsFilterPanelHost],
      providers: [{ provide: NewsTagService, useValue: { getTags: () => of(TAGS) } }],
    });
  });

  it('рендерит все теги чекбоксами', () => {
    const fixture = TestBed.createComponent(NewsFilterPanelHost);
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.checkbox__label')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Турнир', 'Анонс', 'Стрим']);
  });

  it('фильтрует список тегов по поисковому запросу case-insensitive', () => {
    const fixture = TestBed.createComponent(NewsFilterPanelHost);
    fixture.detectChanges();

    const panel = fixture.debugElement.children[0].componentInstance as NewsFilterPanel;
    panel['searchQuery'].set('анон');
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.checkbox__label')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Анонс']);
  });

  it('выбор тега поднимает его наверх списка и добавляет чип', () => {
    const fixture = TestBed.createComponent(NewsFilterPanelHost);
    fixture.detectChanges();

    const panel = fixture.debugElement.children[0].componentInstance as NewsFilterPanel;
    panel['toggleTag']('stream', true);
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.checkbox__label')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Стрим', 'Турнир', 'Анонс']);

    const chipTexts = Array.from(
      fixture.nativeElement.querySelectorAll('.news-filter-panel__chip p-tag'),
    ).map((el: unknown) => (el as HTMLElement).textContent?.trim());
    expect(chipTexts).toEqual(['Стрим']);
  });

  it('крестик на чипе снимает выбор тега и возвращает его на исходное место', () => {
    const fixture = TestBed.createComponent(NewsFilterPanelHost);
    fixture.detectChanges();

    const panel = fixture.debugElement.children[0].componentInstance as NewsFilterPanel;
    panel['toggleTag']('stream', true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const removeButton = el.querySelector<HTMLButtonElement>('.news-filter-panel__chip-remove')!;
    removeButton.click();
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.checkbox__label')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Турнир', 'Анонс', 'Стрим']);
    expect(fixture.nativeElement.querySelector('.news-filter-panel__chip')).toBeNull();
  });

  it('эмитит filterChange при выборе тега', () => {
    const fixture = TestBed.createComponent(NewsFilterPanelHost);
    fixture.detectChanges();

    const panel = fixture.debugElement.children[0].componentInstance as NewsFilterPanel;
    panel['toggleTag']('tournament', true);
    fixture.detectChanges();

    expect(fixture.componentInstance.lastFilter()).toEqual({
      dateFrom: null,
      dateTo: null,
      tags: ['tournament'],
    });
  });
});
