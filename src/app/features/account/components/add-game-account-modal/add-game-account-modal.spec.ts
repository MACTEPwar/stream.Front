import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { GameAccount } from '@core/models/game-account.model';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AddGameAccountModal } from './add-game-account-modal';

function fillInput(el: HTMLElement, index: number, value: string): void {
  const input = el.querySelectorAll<HTMLInputElement>('.text-field__input')[index];
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

const mockAccount: GameAccount = {
  id: 'acc-3',
  userId: 'user-1',
  nickname: 'NewNick',
  externalId: 'steam-999',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AddGameAccountModal', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AddGameAccountModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит 2 поля и кнопки «Добавить»/«Отмена»', () => {
    const fixture = TestBed.createComponent(AddGameAccountModal);
    fixture.componentRef.setInput('data', { onCreated: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('app-text-field').length).toBe(2);
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Добавить', 'Отмена']);
  });

  it('пустые поля — toast-ошибка, без запроса', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(AddGameAccountModal);
    fixture.componentRef.setInput('data', { onCreated: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(showSpy).toHaveBeenCalledWith('Заполните ник и id аккаунта', 'error');
    httpMock.expectNone(`${environment.apiUrl}/profile/game-accounts`);
  });

  it('успешное добавление — POST /profile/game-accounts, вызывает onCreated и закрывает модалку', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const onCreated = vi.fn();
    const fixture = TestBed.createComponent(AddGameAccountModal);
    fixture.componentRef.setInput('data', { onCreated });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'NewNick');
    fillInput(el, 1, 'steam-999');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nickname: 'NewNick', externalId: 'steam-999' });
    req.flush(mockAccount);

    expect(onCreated).toHaveBeenCalledWith(mockAccount);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('ошибка API — toast, модалка остаётся открытой', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const closeSpy = vi.spyOn(modalService, 'close');
    const onCreated = vi.fn();
    const fixture = TestBed.createComponent(AddGameAccountModal);
    fixture.componentRef.setInput('data', { onCreated });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'NewNick');
    fillInput(el, 1, 'steam-999');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`);
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(showSpy).toHaveBeenCalledWith('Что-то пошло не так, попробуйте позже', 'error');
    expect(onCreated).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('«Отмена» — закрывает модалку без запроса', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const fixture = TestBed.createComponent(AddGameAccountModal);
    fixture.componentRef.setInput('data', { onCreated: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('app-button button.button');
    buttons[1].click();

    expect(closeSpy).toHaveBeenCalled();
    httpMock.expectNone(`${environment.apiUrl}/profile/game-accounts`);
  });
});
