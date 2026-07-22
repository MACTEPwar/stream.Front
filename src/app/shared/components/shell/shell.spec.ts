import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ModalService } from '@core/services/modal.service';
import { LoginModal } from '@features/auth/components/login-modal/login-modal';
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

  it('рендерит лого «Belochka» картинкой', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const logoImg = (fixture.nativeElement as HTMLElement).querySelector('.shell__logo img');
    expect(logoImg?.getAttribute('src')).toBe('/images/Logo.png');
    expect(logoImg?.getAttribute('alt')).toBe('Belochka');
  });

  it('рендерит nav-ссылки на все 5 разделов сайта', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const links = Array.from(el.querySelectorAll('.shell__nav-link')).map((a) =>
      a.textContent?.trim(),
    );
    expect(links).toEqual(['Главная', 'Новости', 'Турниры', 'Видео', 'О себе']);
  });

  it('рендерит кнопку входа (secondary Button, без auth-состояния) и кнопку поддержки (primary Button с иконкой)', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;

    const authButton = el.querySelector('.shell__auth-button');
    expect(authButton?.textContent?.trim()).toContain('Войти');

    const supportButton = el.querySelector('.shell__support-button');
    expect(supportButton?.textContent?.trim()).toContain('Поддержать');
    expect(supportButton?.querySelector('img[icon]')).not.toBeNull();
  });

  it('клик по кнопке «Войти» открывает LoginModal через ModalService', () => {
    const modalService = TestBed.inject(ModalService);
    const openSpy = vi.spyOn(modalService, 'open');

    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.shell__auth-button button.button')?.click();

    expect(openSpy).toHaveBeenCalledWith(LoginModal);
  });

  it('рендерит спроецированный контент внутри shell__content', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const projected = (fixture.nativeElement as HTMLElement).querySelector('#projected');
    expect(projected?.textContent).toBe('Контент страницы');
  });
});
