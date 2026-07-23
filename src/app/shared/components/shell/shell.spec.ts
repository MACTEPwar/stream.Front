import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '@core/services/auth.service';
import { CurrentUser } from '@core/models/current-user.model';
import { ModalService } from '@core/services/modal.service';
import { LoginModal } from '@features/auth/components/login-modal/login-modal';
import { Shell } from './shell';

const mockUser: CurrentUser = {
  id: '1',
  login: 'streamer',
  role: 'USER',
  email: 'streamer@example.com',
  name: 'Иван',
  avatarUrl: null,
};

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
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('гость: рендерит кнопку «Войти», не рендерит аватар/имя', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.shell__auth-button')).not.toBeNull();
    expect(el.querySelector('.shell__account-link')).toBeNull();
  });

  it('залогинен: кнопка «Войти» исчезает, вместо неё аватар+имя со ссылкой на /account', () => {
    const authService = TestBed.inject(AuthService);
    (authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }).currentUserSignal.set(
      mockUser,
    );

    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.shell__auth-button')).toBeNull();

    const accountLink = el.querySelector('.shell__account-link');
    expect(accountLink).not.toBeNull();
    expect(accountLink?.getAttribute('href')).toBe('/account');
    expect(accountLink?.querySelector('.shell__account-name')?.textContent).toBe('Иван');
  });

  it('залогинен без avatarUrl: рендерит плейсхолдер-заглушку вместо <img>', () => {
    const authService = TestBed.inject(AuthService);
    (authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }).currentUserSignal.set(
      mockUser,
    );

    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.shell__account-avatar--placeholder')).not.toBeNull();
    expect(el.querySelector('img.shell__account-avatar')).toBeNull();
  });

  it('залогинен с avatarUrl: рендерит <img> с этим src, без плейсхолдера', () => {
    const authService = TestBed.inject(AuthService);
    (authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }).currentUserSignal.set({
      ...mockUser,
      avatarUrl: '/uploads/avatar.png',
    });

    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const img = el.querySelector<HTMLImageElement>('img.shell__account-avatar');
    expect(img?.getAttribute('src')).toBe('/uploads/avatar.png');
    expect(el.querySelector('.shell__account-avatar--placeholder')).toBeNull();
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
