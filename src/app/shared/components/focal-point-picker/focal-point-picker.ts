import { Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';

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
 * координаты отдаются в процентах (0..100) через `pointChange`/`pointCommit`.
 * Рядом — превью кропа в трёх характерных пропорциях (квадрат 1:1, широкая
 * 16:9, высокая 3:4, `object-fit: cover` с тем же `object-position`, что и у
 * реального применения точки в `NewsCard`), чтобы сразу было видно, что
 * фокус нигде не отрезает главный объект. `point() === null` — центр
 * (50/50), кнопка «Сбросить в центр» эмитит `null` явно (не `{x:50,y:50}`) —
 * так потребитель отличает «сброшено» от «выбрана точка, совпавшая с
 * центром».
 *
 * **`pointChange` vs `pointCommit`** (починка бага «маркер прыгает в центр
 * при отпускании мыши») — `pointChange` эмитится на каждое перетаскивание,
 * это чисто живое превью, потребитель НЕ обязан ничего персистить по нему.
 * `pointCommit` эмитится один раз — когда перетаскивание завершилось
 * (`pointerup`/потеря указателя) — именно на него подписывается
 * `PinnedGridEditor`, чтобы не слать десятки PATCH-запросов за одно
 * перетаскивание. Пока идёт драг, маркер двигается по внутреннему
 * `livePoint`, а не по входному `point()` — родителю не нужно (и не следует)
 * обновлять `point()` на каждый `pointChange`, чтобы не было гонки между
 * «живой» позицией и данными с сервера. На `pointCommit` `livePoint`
 * очищается — родитель обязан СИНХРОННО отразить закоммиченное значение (или
 * откат при ошибке) обратно во входной `point()` (обычный сигнальный апдейт
 * внутри обработчика вывода успевает до следующего рендера, поэтому маркер
 * не мигает), см. `PinnedGridEditor.onFocalPointChange()`.
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
  readonly pointCommit = output<FocalPointValue | null>();

  private readonly dragging = signal(false);
  private readonly livePoint = signal<FocalPointValue | null>(null);

  protected readonly displayPoint = computed<FocalPointValue>(
    () => this.livePoint() ?? this.point() ?? { x: 50, y: 50 },
  );
  protected readonly objectPosition = computed(() => `${this.displayPoint().x}% ${this.displayPoint().y}%`);

  protected onCanvasPointerDown(event: PointerEvent): void {
    this.dragging.set(true);
    const target = event.target as (Element & { setPointerCapture?(pointerId: number): void }) | null;
    if (target?.setPointerCapture && event.pointerId !== undefined) {
      target.setPointerCapture(event.pointerId);
    }
    this.updateLiveFromEvent(event);
  }

  protected onCanvasPointerMove(event: PointerEvent): void {
    if (!this.dragging()) {
      return;
    }
    this.updateLiveFromEvent(event);
  }

  protected onCanvasPointerUp(): void {
    this.commitDrag();
  }

  protected onCanvasPointerLeave(): void {
    // При `setPointerCapture` (см. `onCanvasPointerDown`) `pointerleave` для
    // захваченного указателя обычно не приходит — этот обработчик остаётся
    // подстраховкой на случай, если capture не сработал (старые браузеры,
    // тестовое окружение).
    this.commitDrag();
  }

  protected onReset(): void {
    this.dragging.set(false);
    this.livePoint.set(null);
    this.pointChange.emit(null);
    this.pointCommit.emit(null);
  }

  private commitDrag(): void {
    if (!this.dragging()) {
      return;
    }
    this.dragging.set(false);
    const point = this.livePoint();
    this.livePoint.set(null);
    if (point) {
      this.pointCommit.emit(point);
    }
  }

  private updateLiveFromEvent(event: PointerEvent): void {
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
    const point = { x: Math.round(x), y: Math.round(y) };
    this.livePoint.set(point);
    this.pointChange.emit(point);
  }
}
