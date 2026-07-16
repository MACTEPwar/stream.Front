import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button } from './button';

@Component({
  selector: 'app-button-host',
  imports: [Button],
  template: `
    <app-button [text]="text" [variant]="variant">
      @if (withIcon) {
        <svg icon viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" /></svg>
      }
    </app-button>
  `,
})
class ButtonHost {
  text = 'Поддержать';
  variant: 'primary' | 'secondary' = 'primary';
  withIcon = false;
}

describe('Button', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonHost] });
  });

  it('рендерит переданный текст', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.button__text')?.textContent).toBe('Поддержать');
  });

  it('по умолчанию — variant primary', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.button');
    expect(button.classList.contains('button--primary')).toBe(true);
    expect(button.classList.contains('button--secondary')).toBe(false);
  });

  it('variant secondary применяет соответствующий класс', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.variant = 'secondary';
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.button');
    expect(button.classList.contains('button--secondary')).toBe(true);
    expect(button.classList.contains('button--primary')).toBe(false);
  });

  it('без иконки — слот [icon] пуст', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('svg[icon]')).toBeNull();
  });

  it('с иконкой — спроецированный SVG рендерится внутри кнопки', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.withIcon = true;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.button svg[icon]')).not.toBeNull();
  });

  it('меняет текст на разной длине без ошибок рендера (короткий/длинный)', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('text', 'ОК');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.button__text').textContent).toBe('ОК');

    fixture.componentRef.setInput('text', 'ПОДДЕРЖАТЬ ПРЯМО СЕЙЧАС');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.button__text').textContent).toBe(
      'ПОДДЕРЖАТЬ ПРЯМО СЕЙЧАС',
    );
  });
});
