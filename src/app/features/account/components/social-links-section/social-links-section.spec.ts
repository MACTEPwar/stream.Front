import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { SocialLink } from '@core/models/social-link.model';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AddSocialLinkModalData } from '../add-social-link-modal/add-social-link-modal';
import { SocialLinksSection } from './social-links-section';

const mockLinks: SocialLink[] = [
  {
    id: 'link-1',
    userId: 'user-1',
    type: 'TELEGRAM',
    value: '@streamer',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'link-2',
    userId: 'user-1',
    type: 'EMAIL',
    value: 'streamer@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('SocialLinksSection', () => {
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;
  let modalService: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SocialLinksSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
    modalService = TestBed.inject(ModalService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('загружает и рендерит список как «Тип: значение»', () => {
    const fixture = TestBed.createComponent(SocialLinksSection);
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLinks);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.social-links-section__card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('.social-links-section__label')?.textContent).toBe('Telegram: @streamer');
    expect(cards[1].querySelector('.social-links-section__label')?.textContent).toBe(
      'Email: streamer@example.com',
    );
  });

  it('пустой список — показывает текст-заглушку', () => {
    const fixture = TestBed.createComponent(SocialLinksSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/social-links`).flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.social-links-section__empty')).not.toBeNull();
  });

  it('ошибка загрузки — показывает ErrorMessage', () => {
    const fixture = TestBed.createComponent(SocialLinksSection);
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/profile/social-links`)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-error-message')).not.toBeNull();
  });

  it('«Добавить» — открывает AddSocialLinkModal, onCreated дописывает ссылку в список без повторного GET', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(SocialLinksSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/social-links`).flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const addButton = Array.from(el.querySelectorAll<HTMLButtonElement>('app-button button.button')).find(
      (b) => b.textContent?.trim() === 'Добавить',
    );
    addButton?.click();

    expect(openSpy).toHaveBeenCalled();
    const data = openSpy.mock.calls[0][1] as AddSocialLinkModalData;

    const newLink: SocialLink = {
      id: 'link-3',
      userId: 'user-1',
      type: 'VIBER',
      value: '+380000000000',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    data.onCreated(newLink);
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/profile/social-links`);
    const cards = el.querySelectorAll('.social-links-section__card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.social-links-section__label')?.textContent).toBe(
      'Viber: +380000000000',
    );
  });

  it('редактирование — переключает карточку в инлайн-режим (select+TextField) и сохраняет через PATCH', () => {
    const fixture = TestBed.createComponent(SocialLinksSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/social-links`).flush(mockLinks);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const firstCard = el.querySelectorAll('.social-links-section__card')[0];
    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();
    fixture.detectChanges();

    const select = firstCard.querySelector<HTMLSelectElement>('.social-links-section__select');
    expect(select).not.toBeNull();
    select!.value = 'TIKTOK';
    select!.dispatchEvent(new Event('change'));

    const valueInput = firstCard.querySelector<HTMLInputElement>('.text-field__input');
    valueInput!.value = '@newtiktok';
    valueInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links/link-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ type: 'TIKTOK', value: '@newtiktok' });
    req.flush({ ...mockLinks[0], type: 'TIKTOK', value: '@newtiktok' });
    fixture.detectChanges();

    expect(firstCard.querySelector('.social-links-section__label')?.textContent).toBe('TikTok: @newtiktok');
  });

  it('редактирование — валидация пустого значения не отправляет запрос', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(SocialLinksSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/social-links`).flush(mockLinks);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const firstCard = el.querySelectorAll('.social-links-section__card')[0];
    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();
    fixture.detectChanges();

    const valueInput = firstCard.querySelector<HTMLInputElement>('.text-field__input');
    valueInput!.value = '';
    valueInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();

    expect(showSpy).toHaveBeenCalledWith('Выберите тип и заполните значение', 'error');
    httpMock.expectNone(`${environment.apiUrl}/profile/social-links/link-1`);
  });

  it('удаление — открывает ConfirmModal, подтверждение вызывает DELETE и убирает карточку', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(SocialLinksSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/social-links`).flush(mockLinks);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const firstCard = el.querySelectorAll('.social-links-section__card')[0];
    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[1].click();

    expect(openSpy).toHaveBeenCalled();
    const data = openSpy.mock.calls[0][1] as { message: string; onConfirm: () => void };
    expect(data.message).toContain('Telegram: @streamer');

    data.onConfirm();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links/link-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    fixture.detectChanges();

    const cards = el.querySelectorAll('.social-links-section__card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.social-links-section__label')?.textContent).toBe(
      'Email: streamer@example.com',
    );
  });

  it('ошибка API при удалении — показывает toast с текстом сервера', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(SocialLinksSection);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/profile/social-links`).flush(mockLinks);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const firstCard = el.querySelectorAll('.social-links-section__card')[0];
    firstCard.querySelectorAll<HTMLButtonElement>('app-button button.button')[1].click();

    const data = openSpy.mock.calls[0][1] as { onConfirm: () => void };
    data.onConfirm();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links/link-1`);
    req.flush(
      { statusCode: 403, message: 'Доступ запрещён', error: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(showSpy).toHaveBeenCalledWith('Доступ запрещён', 'error');
  });
});
