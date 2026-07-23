import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { SocialLink } from '@core/models/social-link.model';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AddSocialLinkModal } from './add-social-link-modal';

function fillTextField(el: HTMLElement, value: string): void {
  const input = el.querySelector<HTMLInputElement>('.text-field__input');
  if (!input) throw new Error('text-field input not found');
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function selectType(el: HTMLElement, value: string): void {
  const select = el.querySelector<HTMLSelectElement>('.add-social-link-modal__select');
  if (!select) throw new Error('select not found');
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

const mockLink: SocialLink = {
  id: 'link-3',
  userId: 'user-1',
  type: 'TELEGRAM',
  value: '@newhandle',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AddSocialLinkModal', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AddSocialLinkModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит select с 5 опциями типа + плейсхолдером и кнопки «Добавить»/«Отмена»', () => {
    const fixture = TestBed.createComponent(AddSocialLinkModal);
    fixture.componentRef.setInput('data', { onCreated: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const options = el.querySelectorAll('.add-social-link-modal__select option');
    expect(options.length).toBe(6);
    expect(el.querySelectorAll('app-text-field').length).toBe(1);
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Добавить', 'Отмена']);
  });

  it('без выбранного типа или пустого значения — toast-ошибка, без запроса', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(AddSocialLinkModal);
    fixture.componentRef.setInput('data', { onCreated: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Выберите тип и заполните значение', 'error');
    httpMock.expectNone(`${environment.apiUrl}/profile/social-links`);
  });

  it('успешное добавление — POST /profile/social-links, вызывает onCreated и закрывает модалку', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const onCreated = vi.fn();
    const fixture = TestBed.createComponent(AddSocialLinkModal);
    fixture.componentRef.setInput('data', { onCreated });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    selectType(el, 'TELEGRAM');
    fillTextField(el, '@newhandle');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'TELEGRAM', value: '@newhandle' });
    req.flush(mockLink);

    expect(onCreated).toHaveBeenCalledWith(mockLink);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('ошибка API — toast, модалка остаётся открытой', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const closeSpy = vi.spyOn(modalService, 'close');
    const onCreated = vi.fn();
    const fixture = TestBed.createComponent(AddSocialLinkModal);
    fixture.componentRef.setInput('data', { onCreated });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    selectType(el, 'TELEGRAM');
    fillTextField(el, '@newhandle');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links`);
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(showSpy).toHaveBeenCalledWith('Что-то пошло не так, попробуйте позже', 'error');
    expect(onCreated).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('«Отмена» — закрывает модалку без запроса', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(AddSocialLinkModal);
    fixture.componentRef.setInput('data', { onCreated: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('app-button button.button');
    buttons[1].click();

    expect(closeSpy).toHaveBeenCalled();
    httpMock.expectNone(`${environment.apiUrl}/profile/social-links`);
  });
});
