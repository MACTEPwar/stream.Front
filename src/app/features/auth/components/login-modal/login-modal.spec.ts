import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '@env/environment';
import { CurrentUser } from '@core/models/current-user.model';
import { GoogleAuthService } from '@core/services/google-auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { RegisterModal } from '../register-modal/register-modal';
import { LoginModal } from './login-modal';

function fillInput(el: HTMLElement, index: number, value: string): void {
  const input = el.querySelectorAll<HTMLInputElement>('.text-field__input')[index];
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('LoginModal', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;
  let googleAuthService: {
    renderButton: ReturnType<typeof vi.fn<(el: HTMLElement) => Observable<CurrentUser>>>;
  };

  beforeEach(() => {
    googleAuthService = { renderButton: vi.fn().mockReturnValue(new Observable<CurrentUser>()) };

    TestBed.configureTestingModule({
      imports: [LoginModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GoogleAuthService, useValue: googleAuthService },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит поля логина/пароля и кнопку подтверждения', () => {
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('app-text-field').length).toBe(2);
    expect(el.querySelector('app-decorative-button')).not.toBeNull();
  });

  it('сабмит с пустыми полями — показывает toast-ошибку и не бьёт в API', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Заполните логин и пароль', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/login`);
  });

  it('успешный логин — закрывает модалку через ModalService', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({ login: 'streamer', password: 'secret' });
    req.flush({
      id: '1',
      role: 'USER',
      name: 'streamer',
      avatarUrl: null,
      authMethods: [{ type: 'LOCAL' }],
    });

    expect(closeSpy).toHaveBeenCalled();
  });

  it('401 при логине — показывает toast "Неверный логин или пароль"', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'wrong');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(showSpy).toHaveBeenCalledWith('Неверный логин или пароль', 'error');
  });

  it('иная ошибка при логине — показывает общий toast-текст', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(showSpy).toHaveBeenCalledWith('Что-то пошло не так, попробуйте позже', 'error');
  });

  it('рендерит невидимую Google-кнопку поверх стилизованной оверлеем', async () => {
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const overlay = el.querySelector<HTMLDivElement>('.login-modal__google-button-overlay');
    expect(overlay).not.toBeNull();
    expect(googleAuthService.renderButton).toHaveBeenCalledWith(overlay);
  });

  it('успешный вход через renderButton() — закрывает модалку через ModalService', async () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    googleAuthService.renderButton.mockReturnValue(
      of({ id: '1', role: 'USER', name: null, avatarUrl: null, authMethods: [{ type: 'GOOGLE' }] }),
    );
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(closeSpy).toHaveBeenCalled();
    httpMock.expectNone(`${environment.apiUrl}/auth/google`);
  });

  it('ошибка renderButton() — показывает toast, модалка остаётся открытой', async () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const showSpy = vi.spyOn(notificationService, 'show');
    googleAuthService.renderButton.mockReturnValue(throwError(() => new Error('Ошибка Google')));
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(showSpy).toHaveBeenCalledWith('Не удалось войти через Google, попробуйте снова', 'error');
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('клик по Facebook — показывает уведомление-заглушку, без обращения к API', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const [, facebookButton] = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.login-modal__social-button'),
    );
    facebookButton.click();
    expect(showSpy).toHaveBeenCalledWith('Вход через Facebook пока не реализован', 'info');
  });

  it('клик по футер-ссылке открывает RegisterModal', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.auth-modal-shell__footer-link')?.click();

    expect(openSpy).toHaveBeenCalledWith(RegisterModal);
  });
});
