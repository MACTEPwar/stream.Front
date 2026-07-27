import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button, ButtonSeverity, ButtonSize } from './button';

@Component({
  selector: 'app-button-host',
  imports: [Button],
  template: `
    <app-button
      [text]="text()"
      [severity]="severity()"
      [size]="size()"
      [disabled]="disabled()"
      [icon]="icon()"
      (click)="onClick()"
    />
  `,
})
class ButtonHost {
  readonly text = signal('Сохранить');
  readonly severity = signal<ButtonSeverity | undefined>(undefined);
  readonly size = signal<ButtonSize | undefined>(undefined);
  readonly disabled = signal(false);
  readonly icon = signal<string | undefined>(undefined);
  readonly onClick = vi.fn();
}

describe('Button', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonHost] });
  });

  it('рендерит нативную кнопку с pButton-директивой и переданным текстом', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).not.toBeNull();
    expect(button.hasAttribute('pbutton') || button.classList.contains('p-button')).toBe(true);
    expect(button.textContent.trim()).toBe('Сохранить');
  });

  it('без icon() — слот иконки в DOM не рендерится вовсе', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('i')).toBeNull();
  });

  it('с icon() — рендерит <i> с переданным классом перед текстом', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.icon.set('pi pi-trash');
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('i');
    expect(icon).not.toBeNull();
    expect(icon.className).toBe('pi pi-trash');
  });

  it('severity="danger" — прокидывается в pButton (класс p-button-danger)', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.severity.set('danger');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('p-button-danger')).toBe(true);
  });

  it('size="small" — прокидывается в pButton (класс p-button-sm)', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.size.set('small');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('p-button-sm')).toBe(true);
  });

  it('disabled() блокирует нативную кнопку', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  it('клик по кнопке всплывает наружу', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();

    expect(fixture.componentInstance.onClick).toHaveBeenCalled();
  });
});
