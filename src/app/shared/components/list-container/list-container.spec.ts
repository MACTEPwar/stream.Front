import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ListContainer, ListContainerDirection, ListContainerItemWidth } from './list-container';

@Component({
  selector: 'app-list-container-host',
  imports: [ListContainer],
  template: `
    <app-list-container [direction]="direction()" [itemWidth]="itemWidth()" [gap]="gap()">
      <div class="item">1</div>
      <div class="item">2</div>
      <div class="item">3</div>
    </app-list-container>
  `,
})
class ListContainerHost {
  readonly direction = signal<ListContainerDirection>('column');
  readonly itemWidth = signal<ListContainerItemWidth>('stretch');
  readonly gap = signal(0);
}

describe('ListContainer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ListContainerHost] });
  });

  it('дефолт (column + stretch) — grid-auto-flow: row, элементы растягиваются (justify-items: stretch)', () => {
    const fixture = TestBed.createComponent(ListContainerHost);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement.querySelector('app-list-container');
    const cs = getComputedStyle(host);
    expect(cs.display).toBe('grid');
    expect(cs.gridAutoFlow).toBe('row');
    expect(cs.justifyItems).toBe('stretch');
  });

  it("direction='row' + itemWidth='stretch' — grid-auto-flow: column, колонки делят ширину поровну (1fr)", () => {
    const fixture = TestBed.createComponent(ListContainerHost);
    fixture.componentInstance.direction.set('row');
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement.querySelector('app-list-container');
    const cs = getComputedStyle(host);
    expect(cs.gridAutoFlow).toBe('column');
    expect(cs.gridAutoColumns).toBe('1fr');
    expect(cs.justifyItems).toBe('stretch');
  });

  it("direction='row' + itemWidth='auto' — ширина колонки по контенту (max-content), justify-items: start", () => {
    const fixture = TestBed.createComponent(ListContainerHost);
    fixture.componentInstance.direction.set('row');
    fixture.componentInstance.itemWidth.set('auto');
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement.querySelector('app-list-container');
    const cs = getComputedStyle(host);
    expect(cs.gridAutoColumns).toBe('max-content');
    expect(cs.justifyItems).toBe('start');
  });

  it("itemWidth='auto' в column — элементы не растягиваются по ширине (justify-items: start)", () => {
    const fixture = TestBed.createComponent(ListContainerHost);
    fixture.componentInstance.itemWidth.set('auto');
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement.querySelector('app-list-container');
    expect(getComputedStyle(host).justifyItems).toBe('start');
  });

  it('gap() отражается в CSS gap контейнера', () => {
    const fixture = TestBed.createComponent(ListContainerHost);
    fixture.componentInstance.gap.set(12);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement.querySelector('app-list-container');
    expect(getComputedStyle(host).gap).toBe('12px');
  });

  it('спроецированные дети рендерятся как есть — без обёртки, количество и контент сохраняются', () => {
    const fixture = TestBed.createComponent(ListContainerHost);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement.querySelector('app-list-container');
    const items = host.querySelectorAll(':scope > .item');
    expect(items).toHaveLength(3);
    expect(Array.from(items).map((el) => el.textContent)).toEqual(['1', '2', '3']);
  });
});
