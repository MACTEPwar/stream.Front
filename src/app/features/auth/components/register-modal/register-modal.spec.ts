import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '@env/environment';
import { CurrentUser } from '@core/models/current-user.model';
import { GoogleAuthService } from '@core/services/google-auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { LoginModal } from '../login-modal/login-modal';
import { RegisterModal } from './register-modal';

function fillInput(el: HTMLElement, index: number, value: string): void {
  const input = el.querySelectorAll<HTMLInputElement>('.text-field__input')[index];
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('RegisterModal', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;
  let googleAuthService: {
    renderButton: ReturnType<typeof vi.fn<(el: HTMLElement) => Observable<CurrentUser>>>;
  };

  beforeEach(() => {
    googleAuthService = { renderButton: vi.fn().mockReturnValue(new Observable<CurrentUser>()) };

    TestBed.configureTestingModule({
      imports: [RegisterModal],
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

  it('рендерит поля логина/пароля/повтора пароля и кнопку подтверждения', () => {
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('app-text-field').length).toBe(3);
    expect(el.querySelector('app-button')).not.toBeNull();
  });

  it('сабмит с пустыми полями — показывает toast-ошибку и не бьёт в API', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Заполните логин и пароль', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/register`);
  });

  it('сабмит с несовпадающим повтором пароля — показывает toast-ошибку, не бьёт в API', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret12');
    fillInput(el, 2, 'other1234');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Пароли не совпадают', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/register`);
  });

  it('пароль короче 8 символов — показывает toast-ошибку, не бьёт в API', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'short1');
    fillInput(el, 2, 'short1');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Пароль должен быть не короче 8 символов', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/register`);
  });

  it('400 с массивом message от ValidationPipe — показывает toast с объединённым текстом', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret12');
    fillInput(el, 2, 'secret12');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    req.flush(
      {
        statusCode: 400,
        message: ['password must be longer than or equal to 8 characters'],
        error: 'Bad Request',
        timestamp: '2026-07-22T11:57:15.488Z',
        path: '/auth/register',
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(showSpy).toHaveBeenCalledWith(
      'password must be longer than or equal to 8 characters',
      'error',
    );
  });

  it('успешная регистрация — закрывает модалку через ModalService', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret12');
    fillInput(el, 2, 'secret12');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.body).toEqual({ login: 'streamer', password: 'secret12' });
    req.flush({ id: '1', login: 'streamer', role: 'USER', email: null });

    expect(closeSpy).toHaveBeenCalled();
  });

  it('409 при регистрации — показывает toast "Такой логин уже занят"', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret12');
    fillInput(el, 2, 'secret12');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    req.flush('Conflict', { status: 409, statusText: 'Conflict' });

    expect(showSpy).toHaveBeenCalledWith('Такой логин уже занят', 'error');
  });

  it('иная ошибка при регистрации — показывает общий toast-текст', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret12');
    fillInput(el, 2, 'secret12');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(showSpy).toHaveBeenCalledWith('Что-то пошло не так, попробуйте позже', 'error');
  });

  it('рендерит невидимую Google-кнопку поверх стилизованной оверлеем', async () => {
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const overlay = el.querySelector<HTMLDivElement>('.register-modal__google-button-overlay');
    expect(overlay).not.toBeNull();
    expect(googleAuthService.renderButton).toHaveBeenCalledWith(overlay);
  });

  it('успешный вход через renderButton() — закрывает модалку через ModalService', async () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    googleAuthService.renderButton.mockReturnValue(
      of({ id: '1', login: 'streamer', role: 'USER', email: null, name: null, avatarUrl: null }),
    );
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(closeSpy).toHaveBeenCalled();
    httpMock.expectNone(`${environment.apiUrl}/auth/google`);
  });

  it('ошибка renderButton() — показывает toast, модалка остаётся открытой', async () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const showSpy = vi.spyOn(notificationService, 'show');
    googleAuthService.renderButton.mockReturnValue(throwError(() => new Error('Ошибка Google')));
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(showSpy).toHaveBeenCalledWith('Не удалось войти через Google, попробуйте снова', 'error');
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('клик по Facebook — показывает уведомление-заглушку, без обращения к API', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const [, facebookButton] = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.register-modal__social-button'),
    );
    facebookButton.click();
    expect(showSpy).toHaveBeenCalledWith('Регистрация через Facebook пока не реализована', 'info');
  });

  it('клик по футер-ссылке открывает LoginModal', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(RegisterModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.auth-modal-shell__footer-link')?.click();

    expect(openSpy).toHaveBeenCalledWith(LoginModal);
  });
});
