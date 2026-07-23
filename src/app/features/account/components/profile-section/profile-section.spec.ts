import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AvatarPickerModal, AvatarPickerModalData } from '../avatar-picker-modal/avatar-picker-modal';
import { ChangePasswordModal } from '../change-password-modal/change-password-modal';
import { ProfileSection } from './profile-section';

function fillInput(el: HTMLElement, index: number, value: string): void {
  const input = el.querySelectorAll<HTMLInputElement>('.text-field__input')[index];
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function clickButton(el: HTMLElement, index: number): void {
  el.querySelectorAll<HTMLButtonElement>('app-button button.button')[index].click();
}

describe('ProfileSection', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfileSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит превью аватара, имя, «Сохранить» и «Сменить пароль»', () => {
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.profile-section__avatar-preview')).not.toBeNull();
    expect(el.querySelectorAll('app-text-field').length).toBe(1);
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Поменять', 'Сохранить', 'Сменить пароль']);
  });

  it('клик «Поменять» открывает AvatarPickerModal с текущим avatarUrl, onConfirm обновляет превью', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    clickButton(el, 0);

    expect(openSpy).toHaveBeenCalledWith(
      AvatarPickerModal,
      expect.objectContaining({ currentUrl: null }),
    );

    const data = openSpy.mock.calls[0][1] as AvatarPickerModalData;
    data.onConfirm('/images/avatar-presets/preset-2.svg');
    fixture.detectChanges();

    const img = el.querySelector<HTMLImageElement>('.profile-section__avatar-preview img');
    expect(img?.src).toContain('/images/avatar-presets/preset-2.svg');
  });

  it('клик «Сменить пароль» открывает ChangePasswordModal', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    clickButton(el, 2);

    expect(openSpy).toHaveBeenCalledWith(ChangePasswordModal);
  });

  it('«Сохранить» без изменений — не бьёт в API', () => {
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    clickButton(el, 1);

    httpMock.expectNone(`${environment.apiUrl}/profile`);
    httpMock.expectNone(`${environment.apiUrl}/profile/avatar`);
  });

  it('«Сохранить» с очищенным (ранее непустым) именем — toast-ошибка, без запроса', () => {
    const authService = TestBed.inject(AuthService);
    authService.login('streamer', 'secret').subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ id: '1', login: 'streamer', role: 'USER', email: null, name: 'Streamer', avatarUrl: null });

    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, '   ');
    fixture.detectChanges();
    clickButton(el, 1);

    expect(showSpy).toHaveBeenCalledWith('Введите отображаемое имя', 'error');
    httpMock.expectNone(`${environment.apiUrl}/profile`);
  });

  it('«Сохранить» с изменённым именем — PATCH /profile, затем GET /auth/me', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'Новый ник');
    fixture.detectChanges();
    clickButton(el, 1);

    const req = httpMock.expectOne(`${environment.apiUrl}/profile`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Новый ник' });
    req.flush({ id: '1', userId: '1', email: null, name: 'Новый ник', avatarUrl: null });

    const meReq = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    meReq.flush({ id: '1', login: 'streamer', role: 'USER', email: null, name: 'Новый ник', avatarUrl: null });

    expect(showSpy).toHaveBeenCalledWith('Профиль обновлён', 'success');
  });

  it('«Сохранить» с изменённым аватаром (выбран в модалке) — PATCH /profile/avatar, затем GET /auth/me', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    clickButton(el, 0);
    const data = openSpy.mock.calls[0][1] as AvatarPickerModalData;
    data.onConfirm('/images/avatar-presets/preset-3.svg');
    fixture.detectChanges();

    clickButton(el, 1);

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/avatar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ avatarUrl: '/images/avatar-presets/preset-3.svg' });
    req.flush({ id: '1', userId: '1', email: null, name: null, avatarUrl: '/images/avatar-presets/preset-3.svg' });

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush({
      id: '1',
      login: 'streamer',
      role: 'USER',
      email: null,
      name: null,
      avatarUrl: '/images/avatar-presets/preset-3.svg',
    });
  });

  it('«Сохранить» с изменёнными именем И аватаром — оба запроса разом (forkJoin)', () => {
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    fillInput(el, 0, 'Новый ник');
    fixture.detectChanges();

    clickButton(el, 0);
    const data = openSpy.mock.calls[0][1] as AvatarPickerModalData;
    data.onConfirm('/images/avatar-presets/preset-4.svg');
    fixture.detectChanges();

    clickButton(el, 1);

    const profileReq = httpMock.expectOne(`${environment.apiUrl}/profile`);
    const avatarReq = httpMock.expectOne(`${environment.apiUrl}/profile/avatar`);
    profileReq.flush({ id: '1', userId: '1', email: null, name: 'Новый ник', avatarUrl: null });
    avatarReq.flush({
      id: '1',
      userId: '1',
      email: null,
      name: 'Новый ник',
      avatarUrl: '/images/avatar-presets/preset-4.svg',
    });

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush({
      id: '1',
      login: 'streamer',
      role: 'USER',
      email: null,
      name: 'Новый ник',
      avatarUrl: '/images/avatar-presets/preset-4.svg',
    });
  });
});
