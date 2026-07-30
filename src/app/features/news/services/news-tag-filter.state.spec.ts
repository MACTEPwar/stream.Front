import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NewsTag } from '../models/news-tag.model';
import { NewsTagService } from './news-tag.service';
import { NewsTagFilterState, createNewsTagFilterState } from './news-tag-filter.state';

const TAGS: NewsTag[] = [
  { id: 'tournament', name: 'Турнир', severity: 'danger' },
  { id: 'announcement', name: 'Анонс', color: '#d4b106' },
  { id: 'stream', name: 'Стрим', severity: 'success' },
];

@Component({ selector: 'app-news-tag-filter-state-host', template: '' })
class NewsTagFilterStateHost {
  readonly state = createNewsTagFilterState();
}

describe('createNewsTagFilterState', () => {
  let state: NewsTagFilterState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewsTagFilterStateHost],
      providers: [{ provide: NewsTagService, useValue: { getTags: () => of(TAGS) } }],
    });

    const fixture = TestBed.createComponent(NewsTagFilterStateHost);
    state = fixture.componentInstance.state;
    state.loadTags();
    fixture.detectChanges();
  });

  it('загружает теги из NewsTagService', () => {
    expect(state.tags()).toEqual(TAGS);
  });

  it('фильтрует теги по поисковому запросу case-insensitive', () => {
    state.searchQuery.set('анон');
    expect(state.filteredTags().map((tag) => tag.name)).toEqual(['Анонс']);
  });

  it('выбор тега поднимает его наверх списка и в selectedTags', () => {
    state.toggleTag('stream', true);
    expect(state.filteredTags().map((tag) => tag.id)).toEqual([
      'stream',
      'tournament',
      'announcement',
    ]);
    expect(state.selectedTags().map((tag) => tag.id)).toEqual(['stream']);
  });

  it('removeTag снимает выбор и возвращает тег на исходное место', () => {
    state.toggleTag('stream', true);
    state.removeTag('stream');
    expect(state.filteredTags().map((tag) => tag.id)).toEqual([
      'tournament',
      'announcement',
      'stream',
    ]);
    expect(state.selectedTags()).toEqual([]);
  });

  it('formирует filter() снимок с датами и тегами', () => {
    state.toggleTag('tournament', true);
    const dateFrom = new Date(2026, 0, 1);
    const dateTo = new Date(2026, 0, 15);
    state.leftValue.set(dateFrom);
    state.rightValue.set(dateTo);

    expect(state.filter()).toEqual({ dateFrom, dateTo, tags: ['tournament'] });
  });

  it('activeFilterCount считает выбранные теги + 1 если задан период', () => {
    expect(state.activeFilterCount()).toBe(0);

    state.toggleTag('tournament', true);
    state.toggleTag('stream', true);
    expect(state.activeFilterCount()).toBe(2);

    state.leftValue.set(new Date(2026, 0, 1));
    expect(state.activeFilterCount()).toBe(3);
  });

  it('reset очищает выбранные теги и даты', () => {
    state.toggleTag('tournament', true);
    state.leftValue.set(new Date(2026, 0, 1));
    state.rightValue.set(new Date(2026, 0, 15));

    state.reset();

    expect(state.selectedTagIds().size).toBe(0);
    expect(state.leftValue()).toBeNull();
    expect(state.rightValue()).toBeNull();
    expect(state.activeFilterCount()).toBe(0);
  });
});
