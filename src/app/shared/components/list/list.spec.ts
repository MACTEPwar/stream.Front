import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { List, ListItemData, ListSettings } from './list';

@Component({
  selector: 'app-list-host',
  imports: [List],
  template: `<app-list [items]="items()" [settings]="settings()" />`,
})
class ListHost {
  readonly items = signal<ListItemData[]>([
    { id: 1, segments: [{ text: 'Пн' }, { text: 'Стрим' }, { text: '20:00' }] },
    { id: 2, segments: [{ text: 'Вт' }, { text: 'Оффлайн', color: '#CF1717' }, { text: '--:--', color: '#CF1717' }] },
  ]);
  readonly settings = signal<ListSettings>({});
}

describe('List', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ListHost] });
  });

  it('рендерит по одному app-list-item на элемент items(), в том же порядке', () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('app-list-item');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelectorAll('.day-row__segment')[0].textContent).toBe('Пн');
    expect(rows[1].querySelectorAll('.day-row__segment')[0].textContent).toBe('Вт');
  });

  it('дефолт (column + stretch) — grid-auto-flow: row, элементы растягиваются (justify-items: stretch)', () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.detectChanges();

    const list: HTMLElement = fixture.nativeElement.querySelector('app-list');
    const cs = getComputedStyle(list);
    expect(cs.display).toBe('grid');
    expect(cs.gridAutoFlow).toBe('row');
    expect(cs.justifyItems).toBe('stretch');
  });

  it("settings() — direction='row'/itemWidth='auto'/gap прокидываются в раскладку :host", () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.componentInstance.settings.set({ direction: 'row', itemWidth: 'auto', gap: 12 });
    fixture.detectChanges();

    const list: HTMLElement = fixture.nativeElement.querySelector('app-list');
    const cs = getComputedStyle(list);
    expect(cs.gridAutoFlow).toBe('column');
    expect(cs.gridAutoColumns).toBe('max-content');
    expect(cs.gap).toBe('12px');
  });
});
