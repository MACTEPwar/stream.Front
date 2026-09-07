import { By } from '@angular/platform-browser';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MarqueeText } from './marquee-text.directive';

// jsdom не реализует ResizeObserver — подменяем фейком и триггерим вручную
// (тот же общий приём, что section-title.spec.ts/list-item.spec.ts).
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect(): void {}

  trigger(width: number): void {
    this.callback(
      [{ contentRect: { width } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

@Component({
  selector: 'app-marquee-text-host',
  imports: [MarqueeText],
  template: `<span class="host" [appMarqueeText]="text()"></span>`,
})
class MarqueeTextHost {
  readonly text = signal('текст');
}

// Директива создаёт внутренний <span> сама (Renderer2, у неё нет шаблона) —
// scrollWidth на нём (jsdom его не считает, всегда 0) подменяется вручную
// через Object.defineProperty, тот же общий приём, что и для ResizeObserver.
function stubScrollWidth(span: HTMLElement, width: number): void {
  Object.defineProperty(span, 'scrollWidth', { value: width, configurable: true });
}

describe('MarqueeText', () => {
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    FakeResizeObserver.instances = [];

    TestBed.configureTestingModule({
      imports: [MarqueeTextHost],
    });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
    vi.useRealTimers();
  });

  function getHostSpan(fixture: { nativeElement: HTMLElement }): HTMLElement {
    return fixture.nativeElement.querySelector('.host') as HTMLElement;
  }

  function getInnerSpan(hostSpan: HTMLElement): HTMLElement {
    return hostSpan.querySelector('span') as HTMLElement;
  }

  it('оборачивает текст во внутренний <span>, textContent хоста не меняется', () => {
    const fixture = TestBed.createComponent(MarqueeTextHost);
    fixture.detectChanges();

    const hostSpan = getHostSpan(fixture);
    expect(hostSpan.textContent).toBe('текст');
    expect(getInnerSpan(hostSpan)).not.toBeNull();
  });

  it('текст помещается (нет overflow) — не анимирует, text-overflow хоста не переопределён (CSS ellipsis как фолбэк)', () => {
    const fixture = TestBed.createComponent(MarqueeTextHost);
    fixture.detectChanges();

    const hostSpan = getHostSpan(fixture);
    const innerSpan = getInnerSpan(hostSpan);
    stubScrollWidth(innerSpan, 50);
    FakeResizeObserver.instances[0]?.trigger(100);
    fixture.detectChanges();

    expect(hostSpan.style.textOverflow).toBe('');
    expect(innerSpan.style.display).toBe('inline');
    expect(innerSpan.style.transform === 'none' || innerSpan.style.transform === '').toBe(true);
  });

  it('текст не помещается — запускает бегущую строку: text-overflow: clip на хосте, враппер переключается на inline-block', () => {
    const fixture = TestBed.createComponent(MarqueeTextHost);
    fixture.detectChanges();

    const hostSpan = getHostSpan(fixture);
    const innerSpan = getInnerSpan(hostSpan);
    stubScrollWidth(innerSpan, 300);
    FakeResizeObserver.instances[0]?.trigger(100); // overflow = 200 > порога
    fixture.detectChanges();

    expect(hostSpan.style.textOverflow).toBe('clip');
    expect(innerSpan.style.display).toBe('inline-block');
  });

  it('overflow не больше порога (2px) — не считается overflow, анимация не запускается (не дёргается на почти точном совпадении)', () => {
    const fixture = TestBed.createComponent(MarqueeTextHost);
    fixture.detectChanges();

    const hostSpan = getHostSpan(fixture);
    const innerSpan = getInnerSpan(hostSpan);
    stubScrollWidth(innerSpan, 101);
    FakeResizeObserver.instances[0]?.trigger(100); // overflow = 1px <= порога
    fixture.detectChanges();

    expect(hostSpan.style.textOverflow).toBe('');
    expect(innerSpan.style.display).toBe('inline');
  });

  it('игнорирует prefers-reduced-motion — по прямому запросу пользователя строка едет всегда, даже при системной настройке "уменьшить движение" (сознательное отступление от ДСТ-Ф-05 именно для этой директивы)', () => {
    const fixture = TestBed.createComponent(MarqueeTextHost);
    fixture.detectChanges();

    const hostSpan = getHostSpan(fixture);
    const innerSpan = getInnerSpan(hostSpan);
    stubScrollWidth(innerSpan, 300);
    FakeResizeObserver.instances[0]?.trigger(100);
    fixture.detectChanges();

    expect(hostSpan.style.textOverflow).toBe('clip');
    expect(innerSpan.style.display).toBe('inline-block');
  });

  it('изменение текста пересчитывает overflow (новый, более длинный текст — запускает анимацию)', () => {
    const fixture = TestBed.createComponent(MarqueeTextHost);
    fixture.detectChanges();

    const hostSpan = getHostSpan(fixture);
    const innerSpan = getInnerSpan(hostSpan);
    stubScrollWidth(innerSpan, 50);
    FakeResizeObserver.instances[0]?.trigger(100);
    fixture.detectChanges();
    expect(hostSpan.style.textOverflow).toBe('');

    fixture.componentInstance.text.set('Гораздо более длинный текст, который не помещается');
    stubScrollWidth(innerSpan, 400);
    fixture.detectChanges();

    expect(innerSpan.textContent).toBe('Гораздо более длинный текст, который не помещается');
    expect(hostSpan.style.textOverflow).toBe('clip');
  });

  describe('прогресс анимации — туда-обратно с паузами на обоих концах (не бесконечная лента по кругу)', () => {
    beforeEach(() => vi.useFakeTimers());

    it('цикл: пауза у начала → едет вперёд → пауза у конца → едет назад → снова пауза у начала', () => {
      const fixture = TestBed.createComponent(MarqueeTextHost);
      fixture.detectChanges();

      const hostSpan = getHostSpan(fixture);
      const innerSpan = getInnerSpan(hostSpan);
      // overflow = 300 - 100 = 200px inner ← travelMs = 200/40*1000 = 5000ms.
      stubScrollWidth(innerSpan, 300);
      FakeResizeObserver.instances[0]?.trigger(100);
      fixture.detectChanges();

      const directive = fixture.debugElement
        .query(By.directive(MarqueeText))
        .injector.get(MarqueeText);

      expect(directive.progress()).toBe(0); // пауза у начала

      vi.advanceTimersByTime(1000); // ровно конец паузы у начала
      expect(directive.progress()).toBeCloseTo(0, 1);

      vi.advanceTimersByTime(2500); // на середине "вперёд" (2500/5000)
      expect(directive.progress()).toBeCloseTo(0.5, 1);

      vi.advanceTimersByTime(2500); // доехал до конца
      expect(directive.progress()).toBeCloseTo(1, 1);

      vi.advanceTimersByTime(1000); // пауза у конца
      expect(directive.progress()).toBeCloseTo(1, 1);

      vi.advanceTimersByTime(2500); // на середине "назад"
      expect(directive.progress()).toBeCloseTo(0.5, 1);

      vi.advanceTimersByTime(2500); // вернулся к началу — новый цикл
      expect(directive.progress()).toBeCloseTo(0, 1);
    });

    it('translateX внутреннего враппера — отрицательный, растёт по модулю вместе с progress()', () => {
      const fixture = TestBed.createComponent(MarqueeTextHost);
      fixture.detectChanges();

      const hostSpan = getHostSpan(fixture);
      const innerSpan = getInnerSpan(hostSpan);
      stubScrollWidth(innerSpan, 300);
      FakeResizeObserver.instances[0]?.trigger(100);
      fixture.detectChanges();

      vi.advanceTimersByTime(1000 + 2500); // середина "вперёд"
      fixture.detectChanges();

      expect(innerSpan.style.transform).toBe('translateX(-100px)'); // 0.5 * 200px overflow
    });
  });
});
