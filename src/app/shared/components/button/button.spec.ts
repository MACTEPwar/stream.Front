import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button } from './button';

@Component({
  selector: 'app-button-host',
  imports: [Button],
  template: `
    <app-button>
      @if (withIcon) {
        <svg icon viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" /></svg>
      }
    </app-button>
  `,
})
class ButtonHost {
  withIcon = false;
}

describe('Button', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonHost] });
  });

  it('рендерит кнопку со статичным SVG', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button.button')).not.toBeNull();
    expect(el.querySelector('svg.button__svg')).not.toBeNull();
  });

  it('без спроецированной иконки — слот [icon] пуст', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('svg[icon]')).toBeNull();
  });

  it('с иконкой — спроецированный SVG рендерится в слоте .button__icon', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.withIcon = true;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.button__icon svg[icon]')).not.toBeNull();
  });

  it('без иконки — текст сдвинут в центр кнопки', async () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const textPath = fixture.nativeElement.querySelector('path[opacity="0.95"]');
    expect(textPath?.getAttribute('transform')).toBe('translate(-26.5155 0)');
  });

  it('с иконкой — текст остаётся на исходном месте (без transform)', async () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.withIcon = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const textPath = fixture.nativeElement.querySelector('path[opacity="0.95"]');
    expect(textPath?.getAttribute('transform')).toBeNull();
  });
});
