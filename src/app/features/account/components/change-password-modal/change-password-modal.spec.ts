import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { ChangePasswordModal } from './change-password-modal';

function fillInput(el: HTMLElement, index: number, value: string): void {
  const input = el.querySelectorAll<HTMLInputElement>('.text-field__input')[index];
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('ChangePasswordModal', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChangePasswordModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит 3 поля пароля и кнопки «Сохранить»/«Отмена»', () => {
    const fixture = TestBed.createComponent(ChangePasswordModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('app-text-field').length).toBe(3);
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Сохранить', 'Отмена']);
  });

  it('пустые поля — toast-ошибка, без запроса', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ChangePasswordModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Заполните текущий и новый пароль', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/change-password`);
  });

  it('новый пароль короче минимума — toast-ошибка, без запроса', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ChangePasswordModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'old-secret');
    fillInput(el, 1, 'short');
    fillInput(el, 2, 'short');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Новый пароль должен быть не короче 8 символов', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/change-password`);
  });

  it('новый пароль и повтор не совпадают — toast-ошибка, без запроса', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ChangePasswordModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'old-secret');
    fillInput(el, 1, 'new-secret-1');
    fillInput(el, 2, 'new-secret-2');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Пароли не совпадают', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/change-password`);
  });

  it('успешная смена пароля — POST /auth/change-password, toast успеха, закрывает модалку', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(ChangePasswordModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'old-secret');
    fillInput(el, 1, 'new-secret');
    fillInput(el, 2, 'new-secret');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ currentPassword: 'old-secret', newPassword: 'new-secret' });
    req.flush({ success: true });

    expect(showSpy).toHaveBeenCalledWith('Пароль обновлён', 'success');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('401 (неверный текущий пароль) — toast, модалка остаётся открытой', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(ChangePasswordModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'wrong-secret');
    fillInput(el, 1, 'new-secret');
    fillInput(el, 2, 'new-secret');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/change-password`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(showSpy).toHaveBeenCalledWith('Неверный текущий пароль', 'error');
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('иная ошибка — общий toast-текст', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ChangePasswordModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'old-secret');
    fillInput(el, 1, 'new-secret');
    fillInput(el, 2, 'new-secret');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/change-password`);
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(showSpy).toHaveBeenCalledWith('Что-то пошло не так, попробуйте позже', 'error');
  });

  it('«Отмена» — закрывает модалку без запроса', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(ChangePasswordModal);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('app-button button.button');
    buttons[1].click();

    expect(closeSpy).toHaveBeenCalled();
    httpMock.expectNone(`${environment.apiUrl}/auth/change-password`);
  });
});
