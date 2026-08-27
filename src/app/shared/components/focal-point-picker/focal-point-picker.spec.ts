import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FocalPointPicker, FocalPointValue } from './focal-point-picker';

@Component({
  selector: 'app-focal-point-picker-host',
  imports: [FocalPointPicker],
  template: `<app-focal-point-picker
    [imageUrl]="imageUrl()"
    [point]="point()"
    (pointChange)="onPointChange($event)"
    (pointCommit)="onPointCommit($event)"
  />`,
})
class FocalPointPickerHost {
  readonly imageUrl = signal('/uploads/test.jpg');
  readonly point = signal<FocalPointValue | null>(null);
  readonly lastEmitted = signal<FocalPointValue | null | 'none'>('none');
  readonly lastCommitted = signal<FocalPointValue | null | 'none'>('none');

  onPointChange(point: FocalPointValue | null): void {
    this.lastEmitted.set(point);
  }

  onPointCommit(point: FocalPointValue | null): void {
    this.lastCommitted.set(point);
    // Тот же приём, что `PinnedGridEditor.onFocalPointChange()` в реальном
    // использовании — родитель СИНХРОННО отражает закоммиченную точку
    // обратно во входной `point()`, чтобы после отпускания курсора маркер не
    // "прыгал" обратно.
    this.point.set(point);
  }
}

function stubCanvasRect(fixture: { nativeElement: HTMLElement }): void {
  const canvas = fixture.nativeElement.querySelector('.focal-point-picker__canvas') as HTMLElement;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    width: 200,
    height: 100,
    top: 0,
    left: 0,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => {},
  } as DOMRect);
}

function pointerEvent(clientX: number, clientY: number): PointerEvent {
  return { clientX, clientY } as PointerEvent;
}

describe('FocalPointPicker', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FocalPointPickerHost] });
  });

  function createPicker() {
    const fixture = TestBed.createComponent(FocalPointPickerHost);
    fixture.detectChanges();
    return fixture;
  }

  it('без point() маркер и превью центрированы (50/50)', () => {
    const fixture = createPicker();
    const marker = fixture.nativeElement.querySelector('.focal-point-picker__marker') as HTMLElement;

    expect(marker.style.left).toBe('50%');
    expect(marker.style.top).toBe('50%');
  });

  it('превью используют object-position из точки', () => {
    const fixture = createPicker();
    fixture.componentInstance.point.set({ x: 20, y: 80 });
    fixture.detectChanges();

    const preview = fixture.nativeElement.querySelector('.focal-point-picker__preview img') as HTMLElement;
    expect(preview.style.objectPosition).toBe('20% 80%');
  });

  it('клик по канвасу эмитит координаты в процентах', () => {
    const fixture = createPicker();
    stubCanvasRect(fixture);
    const canvas = fixture.nativeElement.querySelector('.focal-point-picker__canvas') as HTMLElement;

    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), pointerEvent(100, 25)));

    expect(fixture.componentInstance.lastEmitted()).toEqual({ x: 50, y: 25 });
  });

  it('во время перетаскивания (pointerdown+pointermove) не эмитит pointCommit — только pointChange', () => {
    const fixture = createPicker();
    stubCanvasRect(fixture);
    const canvas = fixture.nativeElement.querySelector('.focal-point-picker__canvas') as HTMLElement;

    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), pointerEvent(100, 25)));
    canvas.dispatchEvent(Object.assign(new Event('pointermove'), pointerEvent(150, 50)));

    expect(fixture.componentInstance.lastEmitted()).toEqual({ x: 75, y: 50 });
    expect(fixture.componentInstance.lastCommitted()).toBe('none');
  });

  it('отпускание кнопки мыши (pointerup) коммитит последнюю позицию перетаскивания одним разом', () => {
    const fixture = createPicker();
    stubCanvasRect(fixture);
    const canvas = fixture.nativeElement.querySelector('.focal-point-picker__canvas') as HTMLElement;

    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), pointerEvent(100, 25)));
    canvas.dispatchEvent(Object.assign(new Event('pointermove'), pointerEvent(150, 50)));
    canvas.dispatchEvent(new Event('pointerup'));

    expect(fixture.componentInstance.lastCommitted()).toEqual({ x: 75, y: 50 });
  });

  it('маркер остаётся на месте отпускания, когда родитель синхронно отражает pointCommit обратно в point()', () => {
    const fixture = createPicker();
    stubCanvasRect(fixture);
    const canvas = fixture.nativeElement.querySelector('.focal-point-picker__canvas') as HTMLElement;
    const marker = fixture.nativeElement.querySelector('.focal-point-picker__marker') as HTMLElement;

    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), pointerEvent(100, 25)));
    canvas.dispatchEvent(new Event('pointerup'));
    fixture.detectChanges();

    expect(marker.style.left).toBe('50%');
    expect(marker.style.top).toBe('25%');
  });

  it('уход курсора за пределы канваса (pointerleave) во время перетаскивания коммитит текущую позицию', () => {
    const fixture = createPicker();
    stubCanvasRect(fixture);
    const canvas = fixture.nativeElement.querySelector('.focal-point-picker__canvas') as HTMLElement;

    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), pointerEvent(100, 25)));
    canvas.dispatchEvent(new Event('pointerleave'));

    expect(fixture.componentInstance.lastCommitted()).toEqual({ x: 50, y: 25 });
  });

  it('«Сбросить в центр» эмитит null', () => {
    const fixture = createPicker();
    fixture.componentInstance.point.set({ x: 20, y: 80 });
    fixture.detectChanges();

    const resetButton = fixture.nativeElement.querySelector('app-button button') as HTMLButtonElement;
    resetButton.click();

    expect(fixture.componentInstance.lastEmitted()).toBeNull();
    expect(fixture.componentInstance.lastCommitted()).toBeNull();
  });
});
