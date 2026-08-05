import { Component, ElementRef, computed, inject, input, output } from '@angular/core';

import { Button } from '../button/button';

export interface FocalPointValue {
  readonly x: number;
  readonly y: number;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Переиспользуемый пикер точки фокуса картинки (`pinned-grid-rework`, по
 * прямому запросу пользователя «где выбирается та самая точка, я не вижу») —
 * показывает картинку целиком, клик/перетаскивание по ней ставит маркер,
 * координаты отдаются в процентах (0..100) через `pointChange`. Рядом —
 * превью кропа в трёх характерных пропорциях (квадрат 1:1, широкая 16:9,
 * высокая 3:4, `object-fit: cover` с тем же `object-position`, что и у
 * реального применения точки в `NewsCard`), чтобы сразу было видно, что
 * фокус нигде не отрезает главный объект. `point() === null` — центр
 * (50/50), кнопка «Сбросить в центр» эмитит `null` явно (не `{x:50,y:50}`) —
 * так потребитель отличает «сброшено» от «выбрана точка, совпавшая с
 * центром».
 *
 * Ничего не сохраняет сама — чисто презентационный компонент, вызывающая
 * сторона (`PinnedGridEditor`) решает, когда и как персистить
 * (`AdminNewsService.updateImageFocalPoint()`).
 */
@Component({
  selector: 'app-focal-point-picker',
  imports: [Button],
  templateUrl: './focal-point-picker.html',
  styleUrl: './focal-point-picker.scss',
})
export class FocalPointPicker {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly imageUrl = input.required<string>();
  readonly point = input<FocalPointValue | null>(null);
  readonly pointChange = output<FocalPointValue | null>();

  protected readonly displayPoint = computed<FocalPointValue>(() => this.point() ?? { x: 50, y: 50 });
  protected readonly objectPosition = computed(() => `${this.displayPoint().x}% ${this.displayPoint().y}%`);

  private dragging = false;

  protected onCanvasPointerDown(event: PointerEvent): void {
    this.dragging = true;
    this.emitFromEvent(event);
  }

  protected onCanvasPointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    this.emitFromEvent(event);
  }

  protected onCanvasPointerUp(): void {
    this.dragging = false;
  }

  protected onReset(): void {
    this.pointChange.emit(null);
  }

  private emitFromEvent(event: PointerEvent): void {
    const canvas = this.elementRef.nativeElement.querySelector('.focal-point-picker__canvas');
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    this.pointChange.emit({ x: Math.round(x), y: Math.round(y) });
  }
}
