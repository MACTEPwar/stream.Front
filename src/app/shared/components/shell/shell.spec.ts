import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { Shell } from './shell';

@Component({
  selector: 'app-shell-host',
  imports: [Shell],
  template: `<app-shell><p id="projected">Контент страницы</p></app-shell>`,
})
class ShellHost {}

describe('Shell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ShellHost],
      providers: [provideRouter([])],
    });
  });

  it('рендерит nav-ссылки на главную/новости/турниры', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const links = Array.from(el.querySelectorAll('.shell__nav-link')).map((a) =>
      a.textContent?.trim(),
    );
    expect(links).toEqual(['Главная', 'Новости', 'Турниры']);
  });

  it('рендерит гостевую кнопку входа без auth-состояния', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('.shell__auth-button');
    expect(button?.textContent?.trim()).toBe('Войти');
  });

  it('рендерит спроецированный контент внутри shell__content', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const projected = (fixture.nativeElement as HTMLElement).querySelector('#projected');
    expect(projected?.textContent).toBe('Контент страницы');
  });
});
