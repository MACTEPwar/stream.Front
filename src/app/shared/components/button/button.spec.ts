import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button } from './button';

@Component({
  selector: 'app-button-host',
  imports: [Button],
  template: `
    <app-button [text]="text()">
      @if (withIcon()) {
        <svg icon viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" /></svg>
      }
    </app-button>
  `,
})
class ButtonHost {
  readonly text = signal('Поддержать');
  readonly withIcon = signal(false);
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

  it('без иконки — текст отцентрован (left: 50%)', async () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text: HTMLElement = fixture.nativeElement.querySelector('.button__text');
    expect(text.style.left).toBe('50%');
  });

  it('с иконкой — текст смещён к исходному якорю (left: 58.286%)', async () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.withIcon.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text: HTMLElement = fixture.nativeElement.querySelector('.button__text');
    expect(text.style.left).toBe('58.286%');
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
});
