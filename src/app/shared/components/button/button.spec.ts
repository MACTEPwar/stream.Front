import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button } from './button';

@Component({
  selector: 'app-button-host',
  imports: [Button],
  template: `
    <app-button [text]="text()" [width]="width()">
      @if (withIcon()) {
        <svg icon viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" /></svg>
      }
    </app-button>
  `,
})
class ButtonHost {
  readonly text = signal('Поддержать');
  readonly withIcon = signal(false);
  readonly width = signal<number | undefined>(undefined);
}

describe('Button', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonHost] });
  });

  it('рендерит кнопку со статичным SVG и переданным текстом', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button.button')).not.toBeNull();
    expect(el.querySelector('svg.button__svg')).not.toBeNull();
    expect(el.querySelector('.button__text')?.textContent).toBe('Поддержать');
  });

  it('без спроецированной иконки — слот [icon] пуст', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('svg[icon]')).toBeNull();
  });

  it('с иконкой — спроецированный SVG рендерится в слоте .button__icon', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.withIcon.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.button__icon svg[icon]')).not.toBeNull();
  });

  it('без иконки — слот .button__icon пуст и убран из раскладки (display: none), текст один по центру', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const icon = el.querySelector('.button__icon') as HTMLElement;
    const content = el.querySelector('.button__content') as HTMLElement;
    expect(icon.childElementCount).toBe(0);
    expect(getComputedStyle(icon).display).toBe('none');
    expect(getComputedStyle(content).justifyContent).toBe('center');
  });

  it('иконка+текст — единая flex-группа, отцентрованная по всей кнопке, с зазором 8px', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.withIcon.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const content = el.querySelector('.button__content') as HTMLElement;
    const cs = getComputedStyle(content);
    expect(cs.display).toBe('flex');
    expect(cs.justifyContent).toBe('center');
    expect(cs.gap).toBe('8px');
    expect(getComputedStyle(el.querySelector('.button__icon') as HTMLElement).display).not.toBe('none');
  });

  it('меняет текст на разной длине без ошибок рендера (короткий/длинный)', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.button__text').textContent).toBe('Поддержать');

    fixture.componentInstance.text.set('Поддержать прямо сейчас');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.button__text').textContent).toBe(
      'Поддержать прямо сейчас',
    );
  });

  it('без width() — ширина кнопки равна точному эквиваленту исходных 320 unit', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const button: HTMLElement = fixture.nativeElement.querySelector('button.button');
    expect(button.style.width).toBe(`${(320 * 48) / 51}px`);
  });

  it('width() — растягивает кнопку до заданного количества пикселей', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.width.set(500);
    fixture.detectChanges();

    const button: HTMLElement = fixture.nativeElement.querySelector('button.button');
    expect(button.style.width).toBe('500px');
  });

  it('width() — растягиваемые блоки (5-блочные группы) получают одинаковый по величине scale, острые концы (clip-left/clip-right) transform не получают', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.width.set(500);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.button__svg');
    const leftTip = svg.querySelector('path[clip-path="url(#clip-left_2821_998)"]');
    const midLeft = svg.querySelector('path[clip-path="url(#clip-mid-left_2821_998)"]');
    const midRight = svg.querySelector('path[clip-path="url(#clip-mid-right_2821_998)"]');

    expect(leftTip?.getAttribute('transform')).toBeNull();
    expect(midLeft?.getAttribute('transform')).toContain('scale(');
    expect(midRight?.getAttribute('transform')).toContain('scale(');
  });

  it('width() меньше минимума — кламп не даёт блокам инвертироваться', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.width.set(1);
    fixture.detectChanges();

    const button: HTMLElement = fixture.nativeElement.querySelector('button.button');
    expect(parseFloat(button.style.width)).toBeGreaterThan(1);
  });

  it('width() — кольца (filter2_d) не растягиваются, только весь блок сдвигается к новому центру', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.width.set(500);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.button__svg');
    const ringsPath = svg.querySelector('g[filter="url(#filter2_d_2821_998)"] path');
    const maskedGroup = svg.querySelector('g[mask="url(#mask0_2821_998)"]');

    expect(ringsPath?.getAttribute('transform')).toBeNull();
    expect(maskedGroup?.getAttribute('transform')).toBe('translate(105.625 0)');
  });

  it('width() — угловые диамант-блики следуют за своими остриями (с ручной поправкой -6/+6), а не за centerShiftTransform()', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.width.set(500);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.button__svg');
    const sparkles = Array.from(svg.querySelectorAll('path[fill="#FFF9DB"]'));
    expect(sparkles).toHaveLength(2);

    const [left, right] = sparkles;
    expect(left.getAttribute('transform')).toBe('translate(6 0)');
    expect(right.getAttribute('transform')).toBe('translate(205.25 0)');
  });

  it('width() — рамка (filter5_d) использует свои границы (30.0527/289.947), а не границы glow', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.width.set(500);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.button__svg');
    const frameLeftTip = svg.querySelector('path[clip-path="url(#clip-frame-left_2821_998)"]');
    const frameMidLeft = svg.querySelector('path[clip-path="url(#clip-frame-mid-left_2821_998)"]');
    const frameMidRight = svg.querySelector('path[clip-path="url(#clip-frame-mid-right_2821_998)"]');
    const frameRightTip = svg.querySelector('path[clip-path="url(#clip-frame-right_2821_998)"]');

    expect(frameLeftTip?.getAttribute('transform')).toBeNull();
    expect(frameMidLeft?.getAttribute('transform')).toBe(
      'translate(30.0527 0) scale(1.880595061331101 1) translate(-30.0527 0)',
    );
    expect(frameMidRight?.getAttribute('transform')).toBe(
      'translate(275.625 0) scale(1.8805950613311013 1) translate(-170 0)',
    );
    expect(frameRightTip?.getAttribute('transform')).toBe('translate(211.25 0)');

    // glow's own mid-left scale differs (its corner sits at 28.1421, not 30.0527) — the two
    // layers must not accidentally share the same clip-path/transform.
    const glowMidLeft = svg.querySelector('path[clip-path="url(#clip-mid-left_2821_998)"]');
    expect(glowMidLeft?.getAttribute('transform')).not.toBe(frameMidLeft?.getAttribute('transform'));
  });

  it('рамка использует свой собственный clip-frame-mid-center (не общий с glow) — нужен под точечный фикс шва', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.button__svg');
    const frameGap = svg.querySelector('path[clip-path="url(#clip-frame-mid-center_2821_998)"]');
    const glowGap = svg.querySelector('path[clip-path="url(#clip-mid-center_2821_998)"]');
    expect(frameGap).not.toBeNull();
    expect(glowGap).not.toBeNull();
    expect(frameGap).not.toBe(glowGap);
  });

  it('width() — гем (filter3_d) сдвигается вместе с новым центром кнопки', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.width.set(500);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.button__svg');
    const gemGroup = svg.querySelector('g[filter="url(#filter3_d_2821_998)"]');
    expect(gemGroup?.getAttribute('transform')).toBe('translate(105.625 0)');
  });

  it('width() — filter0/filter1/filter5 region заведомо статичный (не [attr.width]), чтобы Chromium не терял растянутую середину', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.width.set(700);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.button__svg');
    ['filter0_i_2821_998', 'filter1_i_2821_998', 'filter5_d_2821_998'].forEach((id) => {
      const filter = svg.querySelector(`#${id}`);
      expect(Number(filter?.getAttribute('width'))).toBeGreaterThan(1000);
    });
  });
});
