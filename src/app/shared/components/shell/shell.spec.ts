import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Component, viewChild } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { environment } from '@env/environment';
import { AuthService } from '@core/services/auth.service';
import { CurrentUser } from '@core/models/current-user.model';
import { ModalService } from '@core/services/modal.service';
import { LoginModal } from '@features/auth/components/login-modal/login-modal';
import { SMALL_QUERY } from '@shared/utils/breakpoints';
import { Shell } from './shell';

const mockUser: CurrentUser = {
  id: '1',
  role: 'USER',
  name: 'Иван',
  avatarUrl: null,
  authMethods: [{ type: 'LOCAL' }],
};

@Component({
  selector: 'app-shell-host',
  imports: [Shell],
  template: `<app-shell><p id="projected">Контент страницы</p></app-shell>`,
})
class ShellHost {
  readonly shell = viewChild.required(Shell);
}

/**
 * `ResizeObserver` недоступен в jsdom (см. JSDoc `Shell`) — измеренные
 * ширины приводятся к нужному соотношению напрямую через каст, тем же
 * приёмом, что и `currentUserSignal` у `AuthService` в тестах выше.
 */
function setMeasuredWidths(
  fixture: ReturnType<typeof TestBed.createComponent<ShellHost>>,
  {
    actionsWidthPx,
    wideRowWidthPx,
  }: {
    actionsWidthPx: number;
    wideRowWidthPx: number;
  },
): void {
  const shell = fixture.componentInstance.shell() as unknown as {
    measuredActionsWidthPx: { set: (n: number) => void };
    measuredWideRowWidthPx: { set: (n: number) => void };
  };
  shell.measuredActionsWidthPx.set(actionsWidthPx);
  shell.measuredWideRowWidthPx.set(wideRowWidthPx);
}

describe('Shell', () => {
  let breakpointState$: Subject<BreakpointState>;

  beforeEach(() => {
    breakpointState$ = new Subject<BreakpointState>();

    TestBed.configureTestingModule({
      imports: [ShellHost],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // jsdom не реализует `matchMedia`, от которого зависит реальный
        // `BreakpointObserver` (тот же приём, что и в modal-host.spec.ts) —
        // начальное синхронное `false` (не compact), конкретные тесты
        // компактного меню переключают через `breakpointState$`.
        {
          provide: BreakpointObserver,
          useValue: { observe: () => breakpointState$.asObservable() },
        },
      ],
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
    (
      authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }
    ).currentUserSignal.set(mockUser);

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
    (
      authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }
    ).currentUserSignal.set(mockUser);

    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.shell__account-avatar--placeholder')).not.toBeNull();
    expect(el.querySelector('img.shell__account-avatar')).toBeNull();
  });

  it('залогинен с avatarUrl (/uploads/*, загружен с ПК) — резолвит src через ImageUrlService на backend origin, без плейсхолдера (bug stream.Front#84)', () => {
    const authService = TestBed.inject(AuthService);
    (
      authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }
    ).currentUserSignal.set({
      ...mockUser,
      avatarUrl: '/uploads/avatar.png',
    });

    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const img = el.querySelector<HTMLImageElement>('img.shell__account-avatar');
    expect(img?.getAttribute('src')).toBe(`${environment.apiUrl}/uploads/avatar.png`);
    expect(el.querySelector('.shell__account-avatar--placeholder')).toBeNull();
  });

  it('гость: не рендерит пункт «Панель управления»', () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.shell__admin-link')).toBeNull();
  });

  it('USER: не рендерит пункт «Панель управления»', () => {
    const authService = TestBed.inject(AuthService);
    (
      authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }
    ).currentUserSignal.set(mockUser);

    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.shell__admin-link')).toBeNull();
  });

  it('ADMIN: рендерит пункт «Панель управления» со ссылкой на /admin', () => {
    const authService = TestBed.inject(AuthService);
    (
      authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }
    ).currentUserSignal.set({
      ...mockUser,
      role: 'ADMIN',
    });

    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const adminLink = el.querySelector('.shell__admin-link');
    expect(adminLink).not.toBeNull();
    expect(adminLink?.getAttribute('href')).toBe('/admin');
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

  describe('компактное меню (ШАП-Ф-02—ШАП-Ф-14, stream.Front#144)', () => {
    function toCompact(): void {
      breakpointState$.next({ matches: true, breakpoints: { [SMALL_QUERY]: true } });
    }

    function toWide(): void {
      breakpointState$.next({ matches: false, breakpoints: { [SMALL_QUERY]: false } });
    }

    it('на некомпактной раскладке строка навигации на месте, переключателя нет', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.shell__nav')).not.toBeNull();
      expect(el.querySelector('.shell__menu-toggle')).toBeNull();
    });

    it('на компактной раскладке переключатель заменяет строку навигации (ШАП-Ф-02)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.shell__menu-toggle')).not.toBeNull();
      expect(el.querySelector('.shell__nav')).toBeNull();
      expect(el.querySelector('.shell__menu-panel')).toBeNull();
    });

    it('клик по переключателю открывает панель с навигацией, кнопкой поддержки и входом (ШАП-Ф-03)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();

      const panel = el.querySelector('.shell__menu-panel');
      expect(panel).not.toBeNull();
      expect(panel?.querySelectorAll('.shell__nav-link').length).toBe(5);
      expect(panel?.querySelector('.shell__support-button')).not.toBeNull();
      expect(panel?.querySelector('.shell__auth-button')).not.toBeNull();
      expect(el.querySelector('.shell__menu-backdrop')).not.toBeNull();
      expect(el.querySelector('.shell__menu-toggle')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('повторный клик по переключателю закрывает панель (ШАП-Ф-04)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const toggle = el.querySelector<HTMLButtonElement>('.shell__menu-toggle');
      toggle?.click();
      fixture.detectChanges();
      toggle?.click();
      fixture.detectChanges();

      expect(el.querySelector('.shell__menu-panel')).toBeNull();
      expect(el.querySelector('.shell__menu-backdrop')).toBeNull();
      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    });

    it('клик по затемнённому фону закрывает панель (ШАП-Ф-04)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();
      el.querySelector<HTMLElement>('.shell__menu-backdrop')?.click();
      fixture.detectChanges();

      expect(el.querySelector('.shell__menu-panel')).toBeNull();
    });

    it('Esc закрывает панель (ШАП-Ф-04)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(el.querySelector('.shell__menu-panel')).toBeNull();
    });

    it('клик по пункту навигации внутри панели закрывает её (ШАП-Ф-05)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();
      // Реальный <a routerLink> — обычный `.click()` запускает настоящую
      // навигацию (в тестовом роутере без реальных маршрутов она падает
      // асинхронным NG04002 уже после конца теста). `ctrlKey: true` —
      // RouterLink сам пропускает навигацию при модификаторах (как при
      // "открыть в новой вкладке"), наш отдельный `(click)="onMenuItemClick()"`
      // при этом всё равно срабатывает — событие одно на оба обработчика.
      el.querySelector<HTMLAnchorElement>('.shell__menu-panel .shell__nav-link')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
      );
      fixture.detectChanges();

      expect(el.querySelector('.shell__menu-panel')).toBeNull();
    });

    it('клик по кнопке поддержки внутри панели закрывает её', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();
      el.querySelector<HTMLButtonElement>(
        '.shell__menu-panel .shell__support-button button.button',
      )?.click();
      fixture.detectChanges();

      expect(el.querySelector('.shell__menu-panel')).toBeNull();
    });

    it('пока меню открыто, страница не прокручивается (ШАП-Ф-12), после закрытия — снова', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const toggle = el.querySelector<HTMLButtonElement>('.shell__menu-toggle');
      toggle?.click();
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('hidden');

      toggle?.click();
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('');
    });

    it('пока меню открыто, shell__content получает inert (ШАП-Ф-10), после закрытия — снимается', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const content = el.querySelector('.shell__content');
      const toggle = el.querySelector<HTMLButtonElement>('.shell__menu-toggle');
      expect(content?.hasAttribute('inert')).toBe(false);

      toggle?.click();
      fixture.detectChanges();
      expect(content?.hasAttribute('inert')).toBe(true);

      toggle?.click();
      fixture.detectChanges();
      expect(content?.hasAttribute('inert')).toBe(false);
    });

    it('панель зациклена через cdkTrapFocus/cdkTrapFocusAutoCapture (ШАП-Ф-09)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();

      const panel = el.querySelector('.shell__menu-panel');
      expect(panel?.hasAttribute('cdkTrapFocus')).toBe(true);
      expect(panel?.hasAttribute('cdkTrapFocusAutoCapture')).toBe(true);
    });

    it('выход из компактной раскладки с открытым меню закрывает его и возвращает строку навигации (ШАП-Ф-11)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      toCompact();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();
      expect(el.querySelector('.shell__menu-panel')).not.toBeNull();

      toWide();
      fixture.detectChanges();

      expect(el.querySelector('.shell__menu-panel')).toBeNull();
      expect(el.querySelector('.shell__menu-backdrop')).toBeNull();
      expect(el.querySelector('.shell__menu-toggle')).toBeNull();
      expect(el.querySelector('.shell__nav')).not.toBeNull();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('средний вид (ШАП-Ф-15—ШАП-Ф-18, stream.Front#146)', () => {
    it('не помещается: переключатель+кнопка поддержки+иконка входа (гость) видны в строке, нав в строке нет', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      setMeasuredWidths(fixture, { actionsWidthPx: 200, wideRowWidthPx: 800 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.shell__menu-toggle')).not.toBeNull();
      expect(el.querySelector('.shell__nav')).toBeNull();
      expect(el.querySelector('.shell__support-button')).not.toBeNull();
      expect(el.querySelector('.shell__login-icon-button')).not.toBeNull();
      expect(el.querySelector('.shell__account-link')).toBeNull();
      expect(el.querySelector('.shell__menu-panel')).toBeNull();
    });

    it('помещается (по умолчанию): переключателя и иконки входа нет, строка навигации на месте', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.shell__menu-toggle')).toBeNull();
      expect(el.querySelector('.shell__login-icon-button')).toBeNull();
      expect(el.querySelector('.shell__nav')).not.toBeNull();
    });

    it('клик по переключателю открывает панель ТОЛЬКО с навигацией — без кнопки поддержки и области входа (ШАП-Ф-17)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      setMeasuredWidths(fixture, { actionsWidthPx: 200, wideRowWidthPx: 800 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();

      const panel = el.querySelector('.shell__menu-panel');
      expect(panel).not.toBeNull();
      expect(panel?.querySelectorAll('.shell__nav-link').length).toBe(5);
      expect(panel?.querySelector('.shell__support-button')).toBeNull();
      expect(panel?.querySelector('.shell__auth-button')).toBeNull();
      expect(panel?.querySelector('.shell__account-link')).toBeNull();
      expect(el.querySelector('.shell__menu-backdrop')).not.toBeNull();
    });

    it('гость: клик по иконке входа открывает LoginModal', () => {
      const modalService = TestBed.inject(ModalService);
      const openSpy = vi.spyOn(modalService, 'open');

      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      setMeasuredWidths(fixture, { actionsWidthPx: 200, wideRowWidthPx: 800 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__login-icon-button')?.click();

      expect(openSpy).toHaveBeenCalledWith(LoginModal);
    });

    it('залогинен: в строке аватар БЕЗ имени', () => {
      const authService = TestBed.inject(AuthService);
      (
        authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }
      ).currentUserSignal.set(mockUser);

      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      setMeasuredWidths(fixture, { actionsWidthPx: 200, wideRowWidthPx: 800 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const accountLink = el.querySelector('.shell__account-link');
      expect(accountLink).not.toBeNull();
      expect(accountLink?.querySelector('.shell__account-avatar')).not.toBeNull();
      expect(accountLink?.querySelector('.shell__account-name')).toBeNull();
      expect(el.querySelector('.shell__login-icon-button')).toBeNull();
    });

    it('ADMIN: ссылка «Панель управления» — в панели, не в строке', () => {
      const authService = TestBed.inject(AuthService);
      (
        authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }
      ).currentUserSignal.set({ ...mockUser, role: 'ADMIN' });

      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      setMeasuredWidths(fixture, { actionsWidthPx: 200, wideRowWidthPx: 800 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.shell__admin-link')).toBeNull();

      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();

      const panel = el.querySelector('.shell__menu-panel');
      const adminLink = panel?.querySelector('.shell__admin-link');
      expect(adminLink).not.toBeNull();
      expect(adminLink?.getAttribute('href')).toBe('/admin');
    });

    it('компактная раскладка страницы побеждает средний вид, даже если контент не помещается (ШАП-Ф-07)', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      breakpointState$.next({ matches: true, breakpoints: { [SMALL_QUERY]: true } });
      setMeasuredWidths(fixture, { actionsWidthPx: 200, wideRowWidthPx: 800 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();

      const panel = el.querySelector('.shell__menu-panel');
      expect(panel?.querySelector('.shell__support-button')).not.toBeNull();
      expect(panel?.querySelector('.shell__auth-button')).not.toBeNull();
    });

    it('живой обратный переход: контент снова помещается — открытая панель закрывается, строка навигации возвращается', () => {
      const fixture = TestBed.createComponent(ShellHost);
      fixture.detectChanges();
      setMeasuredWidths(fixture, { actionsWidthPx: 200, wideRowWidthPx: 800 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      el.querySelector<HTMLButtonElement>('.shell__menu-toggle')?.click();
      fixture.detectChanges();
      expect(el.querySelector('.shell__menu-panel')).not.toBeNull();

      setMeasuredWidths(fixture, { actionsWidthPx: 800, wideRowWidthPx: 200 });
      fixture.detectChanges();

      expect(el.querySelector('.shell__menu-panel')).toBeNull();
      expect(el.querySelector('.shell__menu-toggle')).toBeNull();
      expect(el.querySelector('.shell__nav')).not.toBeNull();
      expect(document.body.style.overflow).toBe('');
    });
  });
});
