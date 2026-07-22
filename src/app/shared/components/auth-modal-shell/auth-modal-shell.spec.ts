import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthModalShell } from './auth-modal-shell';

@Component({
  selector: 'app-auth-modal-shell-host',
  imports: [AuthModalShell],
  template: `
    <app-auth-modal-shell
      [title]="title()"
      [footerText]="footerText()"
      [footerLinkText]="footerLinkText()"
      (footerLinkClick)="footerLinkClicks = footerLinkClicks + 1"
    >
      <p id="projected-field">Поле формы</p>
    </app-auth-modal-shell>
  `,
})
class AuthModalShellHost {
  readonly title = signal('Вход');
  readonly footerText = signal('Нет аккаунта?');
  readonly footerLinkText = signal('Регистрация');
  footerLinkClicks = 0;
}

describe('AuthModalShell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AuthModalShellHost] });
  });

  it('рендерит картинку персонажа', () => {
    const fixture = TestBed.createComponent(AuthModalShellHost);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.auth-modal-shell__image img');
    expect(img?.getAttribute('src')).toBe('/images/login_bg.png');
  });

  it('рендерит заголовок и спроецированное содержимое формы', () => {
    const fixture = TestBed.createComponent(AuthModalShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.auth-modal-shell__title')?.textContent).toBe('Вход');
    expect(el.querySelector('#projected-field')?.textContent).toBe('Поле формы');
  });

  it('рендерит футер-текст и ссылку, клик по ссылке эмиттит footerLinkClick', () => {
    const fixture = TestBed.createComponent(AuthModalShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.auth-modal-shell__footer')?.textContent).toContain('Нет аккаунта?');
    const link = el.querySelector<HTMLButtonElement>('.auth-modal-shell__footer-link')!;
    expect(link.textContent?.trim()).toBe('Регистрация');

    link.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.footerLinkClicks).toBe(1);
  });

  it('без footerText — футер не рендерится', () => {
    const fixture = TestBed.createComponent(AuthModalShellHost);
    fixture.componentInstance.footerText.set('');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.auth-modal-shell__footer')).toBeNull();
  });
});
