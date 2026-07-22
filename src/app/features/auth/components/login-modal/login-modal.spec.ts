import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
    expect(el.querySelector('app-button')).not.toBeNull();
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
    req.flush({ id: '1', login: 'streamer', role: 'USER', email: null });

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

  it('клик по Google/Facebook — показывает уведомление-заглушку, без обращения к API', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(LoginModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const [googleButton, facebookButton] = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.login-modal__social-button'),
    );
    googleButton.click();
    expect(showSpy).toHaveBeenCalledWith('Вход через Google пока не реализован', 'info');

    facebookButton.click();
    expect(showSpy).toHaveBeenCalledWith('Вход через Facebook пока не реализован', 'info');

    httpMock.expectNone(`${environment.apiUrl}/auth/google`);
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
