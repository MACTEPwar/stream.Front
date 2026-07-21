import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { List, ListItemData, ListLoaderSettings, ListSettings } from './list';

@Component({
  selector: 'app-list-host',
  imports: [List],
  template: `<app-list [items]="items()" [settings]="settings()" [loading]="loading()" [loaderSettings]="loaderSettings()" />`,
})
class ListHost {
  readonly items = signal<ListItemData[]>([
    { id: 1, segments: [{ text: 'Пн' }, { text: 'Стрим' }, { text: '20:00' }] },
    { id: 2, segments: [{ text: 'Вт' }, { text: 'Оффлайн', color: '#CF1717' }, { text: '--:--', color: '#CF1717' }] },
  ]);
  readonly settings = signal<ListSettings>({});
  readonly loading = signal(false);
  readonly loaderSettings = signal<ListLoaderSettings | undefined>(undefined);
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

  describe('loading() — скелетон-прелоадер (stream.Front#52)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('loading: false (дефолт) — не рендерит бегуна, обычный список с реальным текстом как раньше', () => {
      const fixture = TestBed.createComponent(ListHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.list__runner')).toBeNull();
      const rows = el.querySelectorAll('app-list-item');
      expect(rows).toHaveLength(2);
      expect(rows[0].querySelectorAll('.day-row__segment')[0].textContent).toBe('Пн');
    });

    it('loading: true — рендерит N плейсхолдеров (ListItem) по loaderSettings().itemsCount, тот же декор, но без текста, у каждого своя гифка-бегун', () => {
      const fixture = TestBed.createComponent(ListHost);
      fixture.componentInstance.loading.set(true);
      fixture.componentInstance.loaderSettings.set({ itemsCount: 3 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const rows = el.querySelectorAll('app-list-item');
      expect(rows).toHaveLength(3);
      rows.forEach((row) => expect(row.querySelector('.day-row__segment')?.textContent?.trim()).toBe(''));
      expect(el.querySelectorAll('.list__runner')).toHaveLength(3);
    });

    it('бегун бежит горизонтально в пределах своей строки: от 0 до 1 (конец), разворот, обратно к 0, разворот — бесконечно (цикл 2*stepDurationMs)', () => {
      const fixture = TestBed.createComponent(ListHost);
      fixture.componentInstance.loading.set(true);
      fixture.componentInstance.loaderSettings.set({ itemsCount: 3, stepDurationMs: 700, staggerMs: 0 });
      fixture.detectChanges();
      const list = fixture.debugElement.children[0].componentInstance as List;

      expect(list.runnerProgress(0)).toBe(0);
      expect(list.runnerGoingForward(0)).toBe(true);

      vi.advanceTimersByTime(700); // ровно конец первой половины цикла (edge case: cycle===step считается уже "назад")
      expect(list.runnerProgress(0)).toBeCloseTo(1, 1);

      vi.advanceTimersByTime(700); // вторая половина — обратно к 0
      expect(list.runnerProgress(0)).toBeCloseTo(0, 1);

      vi.advanceTimersByTime(700); // третья четверть-цикла — снова вперёд
      expect(list.runnerProgress(0)).toBeCloseTo(1, 1);
    });

    it('строки стартуют со сдвигом по фазе (staggerMs) — следующая строка отстаёт от предыдущей', () => {
      const fixture = TestBed.createComponent(ListHost);
      fixture.componentInstance.loading.set(true);
      fixture.componentInstance.loaderSettings.set({ itemsCount: 3, stepDurationMs: 700, staggerMs: 1000 });
      fixture.detectChanges();
      const list = fixture.debugElement.children[0].componentInstance as List;

      // На 700мс первая строка (i=0) уже почти у конца, вторая (i=1, старт
      // на 1000мс) ещё не стартовала вовсе — её elapsed = max(0, 700-1000) = 0.
      vi.advanceTimersByTime(700);
      expect(list.runnerProgress(0)).toBeCloseTo(1, 1);
      expect(list.runnerProgress(1)).toBe(0);

      // На 1700мс вторая строка стартовала 700мс назад (1700-1000) — тоже почти у конца.
      vi.advanceTimersByTime(1000);
      expect(list.runnerProgress(1)).toBeCloseTo(1, 1);
    });

    it('loading переключается в false — elapsedMs сбрасывается в 0', () => {
      const fixture = TestBed.createComponent(ListHost);
      fixture.componentInstance.loading.set(true);
      fixture.componentInstance.loaderSettings.set({ itemsCount: 3, stepDurationMs: 700, staggerMs: 0 });
      fixture.detectChanges();
      const list = fixture.debugElement.children[0].componentInstance as List;

      vi.advanceTimersByTime(350);
      expect(list.elapsedMs()).toBeGreaterThan(0);

      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();
      vi.advanceTimersByTime(50);

      expect(list.elapsedMs()).toBe(0);
    });
  });
});
