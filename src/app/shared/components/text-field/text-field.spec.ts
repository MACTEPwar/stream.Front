import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TextField, TextFieldType } from './text-field';

@Component({
  selector: 'app-text-field-host',
  imports: [TextField],
  template: `
    <app-text-field
      [label]="label()"
      [type]="type()"
      [required]="required()"
      [placeholder]="placeholder()"
      [(value)]="value"
      [errorText]="errorText()"
    />
  `,
})
class TextFieldHost {
  readonly label = signal('Логин');
  readonly type = signal<TextFieldType>('text');
  readonly required = signal(false);
  readonly placeholder = signal('Введите логин');
  readonly value = signal('');
  readonly errorText = signal<string | null>(null);
}

describe('TextField', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TextFieldHost] });
  });

  it('рендерит label и placeholder', () => {
    const fixture = TestBed.createComponent(TextFieldHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.text-field__label')?.textContent?.trim()).toBe('Логин');
    expect(el.querySelector<HTMLInputElement>('.text-field__input')?.placeholder).toBe('Введите логин');
  });

  it('ввод в input обновляет [(value)] на хосте', () => {
    const fixture = TestBed.createComponent(TextFieldHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('.text-field__input')!;
    input.value = 'streamer';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('streamer');
  });

  it('изменение value на хосте отражается в input', () => {
    const fixture = TestBed.createComponent(TextFieldHost);
    fixture.detectChanges();

    fixture.componentInstance.value.set('preset');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('.text-field__input')!;
    expect(input.value).toBe('preset');
  });

  it('type="text" (дефолт) — без кнопки-глаза', () => {
    const fixture = TestBed.createComponent(TextFieldHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.text-field__toggle')).toBeNull();
  });

  it('type="password" — input скрыт, кнопка-глаз переключает видимость и aria-label', () => {
    const fixture = TestBed.createComponent(TextFieldHost);
    fixture.componentInstance.type.set('password');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('.text-field__input')!;
    const toggle = el.querySelector<HTMLButtonElement>('.text-field__toggle')!;
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Показать пароль');

    toggle.click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Скрыть пароль');
  });

  it('errorText — рендерит инлайн-ошибку и подсвечивает поле', () => {
    const fixture = TestBed.createComponent(TextFieldHost);
    fixture.componentInstance.errorText.set('Пароли не совпадают');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.text-field__error')?.textContent).toBe('Пароли не совпадают');
    expect(el.querySelector('.text-field__control')?.classList).toContain('text-field__control--invalid');
  });

  it('required — рендерит звёздочку рядом с лейблом', () => {
    const fixture = TestBed.createComponent(TextFieldHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.text-field__required')).toBeNull();

    fixture.componentInstance.required.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.text-field__required')?.textContent).toBe('*');
  });

  it('без errorText — ошибка не рендерится', () => {
    const fixture = TestBed.createComponent(TextFieldHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.text-field__error')).toBeNull();
  });
});
