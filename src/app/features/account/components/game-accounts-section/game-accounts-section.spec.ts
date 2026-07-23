import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { GameAccount } from '@core/models/game-account.model';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AddGameAccountModalData } from '../add-game-account-modal/add-game-account-modal';
import { GameAccountsSection } from './game-accounts-section';

const mockAccounts: GameAccount[] = [
  {
    id: 'acc-1',
    userId: 'user-1',
    nickname: 'Streamer',
    externalId: 'steam-12345',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-2',
    userId: 'user-1',
    nickname: 'SecondNick',
    externalId: 'riot-67890',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('GameAccountsSection', () => {
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;
  let modalService: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GameAccountsSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
    modalService = TestBed.inject(ModalService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('загружает и рендерит список аккаунтов как «ник (id)»', () => {
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAccounts);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.game-accounts-section__card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('.game-accounts-section__label')?.textContent).toBe('Streamer (steam-12345)');
    expect(cards[1].querySelector('.game-accounts-section__label')?.textContent).toBe('SecondNick (riot-67890)');
  });

  it('пустой список — показывает текст-заглушку', () => {
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`).flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.game-accounts-section__empty')).not.toBeNull();
  });

  it('ошибка загрузки — показывает ErrorMessage', () => {
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/profile/game-accounts`)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-error-message')).not.toBeNull();
  });

  it('без карточек всё равно рендерит кнопку «Добавить»', () => {
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`).flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const addButton = Array.from(el.querySelectorAll('app-button')).find(
      (b) => b.textContent?.trim() === 'Добавить',
    );
    expect(addButton).not.toBeUndefined();
  });

  it('«Добавить» — открывает AddGameAccountModal, onCreated дописывает аккаунт в список без повторного GET', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`).flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const addButton = Array.from(el.querySelectorAll<HTMLButtonElement>('app-button button.button')).find(
      (b) => b.textContent?.trim() === 'Добавить',
    );
    addButton?.click();

    expect(openSpy).toHaveBeenCalled();
    const data = openSpy.mock.calls[0][1] as AddGameAccountModalData;

    const newAccount: GameAccount = {
      id: 'acc-3',
      userId: 'user-1',
      nickname: 'NewNick',
      externalId: 'steam-999',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    data.onCreated(newAccount);
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/profile/game-accounts`);
    const cards = el.querySelectorAll('.game-accounts-section__card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.game-accounts-section__label')?.textContent).toBe('NewNick (steam-999)');
  });

  it('редактирование — переключает карточку в инлайн-режим и сохраняет через PATCH', () => {
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`).flush(mockAccounts);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const firstCard = el.querySelectorAll('.game-accounts-section__card')[0];
    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();
    fixture.detectChanges();

    const editInputs = firstCard.querySelectorAll<HTMLInputElement>('input');
    expect(editInputs.length).toBe(2);
    editInputs[0].value = 'UpdatedNick';
    editInputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts/acc-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nickname: 'UpdatedNick', externalId: 'steam-12345' });
    req.flush({ ...mockAccounts[0], nickname: 'UpdatedNick' });
    fixture.detectChanges();

    expect(firstCard.querySelector('.game-accounts-section__label')?.textContent).toBe(
      'UpdatedNick (steam-12345)',
    );
  });

  it('редактирование — валидация пустых полей не отправляет запрос', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`).flush(mockAccounts);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const firstCard = el.querySelectorAll('.game-accounts-section__card')[0];
    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();
    fixture.detectChanges();

    const editInputs = firstCard.querySelectorAll<HTMLInputElement>('input');
    editInputs[0].value = '';
    editInputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();

    expect(showSpy).toHaveBeenCalledWith('Заполните ник и id аккаунта', 'error');
    httpMock.expectNone(`${environment.apiUrl}/profile/game-accounts/acc-1`);
  });

  it('удаление — открывает ConfirmModal, подтверждение вызывает DELETE и убирает карточку', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`).flush(mockAccounts);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const firstCard = el.querySelectorAll('.game-accounts-section__card')[0];
    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[1].click();

    expect(openSpy).toHaveBeenCalled();
    const data = openSpy.mock.calls[0][1] as { message: string; onConfirm: () => void };
    expect(data.message).toContain('Streamer');

    data.onConfirm();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts/acc-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    fixture.detectChanges();

    const cards = el.querySelectorAll('.game-accounts-section__card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.game-accounts-section__label')?.textContent).toBe('SecondNick (riot-67890)');
  });

  it('ошибка API при удалении — показывает toast с текстом сервера', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(GameAccountsSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`).flush(mockAccounts);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const firstCard = el.querySelectorAll('.game-accounts-section__card')[0];
    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[1].click();

    const data = openSpy.mock.calls[0][1] as { onConfirm: () => void };
    data.onConfirm();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts/acc-1`);
    req.flush(
      { statusCode: 403, message: 'Доступ запрещён', error: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(showSpy).toHaveBeenCalledWith('Доступ запрещён', 'error');
  });
});
