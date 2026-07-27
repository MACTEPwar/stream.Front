import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AddLocalMethodModal } from './add-local-method-modal';

function fillInput(el: HTMLElement, index: number, value: string): void {
  const input = el.querySelectorAll<HTMLInputElement>('.text-field__input')[index];
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('AddLocalMethodModal', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AddLocalMethodModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит 2 поля и кнопки «Подключить»/«Отмена»', () => {
    const fixture = TestBed.createComponent(AddLocalMethodModal);
    fixture.componentRef.setInput('data', { onAdded: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('app-text-field').length).toBe(2);
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Подключить', 'Отмена']);
  });

  it('логин короче минимума — toast-ошибка, без запроса', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(AddLocalMethodModal);
    fixture.componentRef.setInput('data', { onAdded: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'ab');
    fillInput(el, 1, 'secret12');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Логин должен быть не короче 3 символов', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/methods/local`);
  });

  it('пароль короче минимума — toast-ошибка, без запроса', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(AddLocalMethodModal);
    fixture.componentRef.setInput('data', { onAdded: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'short1');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Пароль должен быть не короче 8 символов', 'error');
    httpMock.expectNone(`${environment.apiUrl}/auth/methods/local`);
  });

  it('успешное подключение — POST /auth/methods/local, вызывает onAdded и закрывает модалку', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const onAdded = vi.fn();
    const fixture = TestBed.createComponent(AddLocalMethodModal);
    fixture.componentRef.setInput('data', { onAdded });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret12');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/local`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ login: 'streamer', password: 'secret12' });
    req.flush({ success: true });

    expect(onAdded).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('409 (логин занят) — toast, модалка остаётся открытой', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const closeSpy = vi.spyOn(modalService, 'close');
    const onAdded = vi.fn();
    const fixture = TestBed.createComponent(AddLocalMethodModal);
    fixture.componentRef.setInput('data', { onAdded });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret12');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/local`);
    req.flush('Conflict', { status: 409, statusText: 'Conflict' });

    expect(showSpy).toHaveBeenCalledWith('Такой логин уже занят', 'error');
    expect(onAdded).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('иная ошибка API — общий toast-текст, модалка остаётся открытой', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(AddLocalMethodModal);
    fixture.componentRef.setInput('data', { onAdded: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'streamer');
    fillInput(el, 1, 'secret12');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/local`);
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(showSpy).toHaveBeenCalledWith('Что-то пошло не так, попробуйте позже', 'error');
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('«Отмена» — закрывает модалку без запроса', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(AddLocalMethodModal);
    fixture.componentRef.setInput('data', { onAdded: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('app-button button.button');
    buttons[1].click();

    expect(closeSpy).toHaveBeenCalled();
    httpMock.expectNone(`${environment.apiUrl}/auth/methods/local`);
  });
});
