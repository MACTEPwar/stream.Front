import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { CurrentUser } from '@core/models/current-user.model';
import { AuthService } from '@core/services/auth.service';
import { GoogleAuthService } from '@core/services/google-auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmModal } from '@shared/components/confirm-modal/confirm-modal';
import { AddLocalMethodModal, AddLocalMethodModalData } from '../add-local-method-modal/add-local-method-modal';
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

const localOnlyUser: CurrentUser = {
  id: '1',
  role: 'USER',
  name: 'Streamer',
  avatarUrl: null,
  authMethods: [{ type: 'LOCAL' }],
};

const googleOnlyUser: CurrentUser = {
  id: '1',
  role: 'USER',
  name: 'Streamer',
  avatarUrl: null,
  authMethods: [{ type: 'GOOGLE' }],
};

const bothMethodsUser: CurrentUser = {
  id: '1',
  role: 'USER',
  name: 'Streamer',
  avatarUrl: null,
  authMethods: [{ type: 'LOCAL' }, { type: 'GOOGLE' }],
};

describe('ProfileSection', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;
  let authService: AuthService;
  let googleAuthService: {
    connectButton: ReturnType<typeof vi.fn<(el: HTMLElement) => Observable<{ success: true }>>>;
  };

  function setCurrentUser(user: CurrentUser): void {
    (authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }).currentUserSignal.set(user);
  }

  beforeEach(() => {
    googleAuthService = { connectButton: vi.fn().mockReturnValue(new Observable()) };

    TestBed.configureTestingModule({
      imports: [ProfileSection],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GoogleAuthService, useValue: googleAuthService },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    notificationService = TestBed.inject(NotificationService);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит превью аватара, имя, «Сохранить» и блок «Способы входа» (LOCAL: «Сменить пароль», без «Отключить» на единственном методе)', () => {
    setCurrentUser(localOnlyUser);
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.profile-section__avatar-preview')).not.toBeNull();
    expect(el.querySelectorAll('app-text-field').length).toBe(1);
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Поменять', 'Сохранить', 'Сменить пароль']);
    expect(el.textContent).toContain('Способы входа');
    expect(el.textContent).toContain('Локальный вход');
    expect(el.textContent).toContain('Google');
  });

  it('LOCAL не подключён — вместо «Сменить пароль» кнопка «Подключить локальный вход»', () => {
    setCurrentUser(googleOnlyUser);
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons).toContain('Подключить локальный вход');
    expect(buttons).not.toContain('Сменить пароль');
  });

  it('оба метода подключены — показывает «Отключить» для каждого', () => {
    setCurrentUser(bothMethodsUser);
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons.filter((t) => t === 'Отключить').length).toBe(2);
  });

  it('единственный метод — «Отключить» скрыт (клиентская защита)', () => {
    setCurrentUser(localOnlyUser);
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('app-button')).map((b) => b.textContent?.trim());
    expect(buttons).not.toContain('Отключить');
  });

  it('клик «Подключить локальный вход» открывает AddLocalMethodModal; onAdded — GET /auth/me и toast успеха', () => {
    setCurrentUser(googleOnlyUser);
    const openSpy = vi.spyOn(modalService, 'open');
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('app-button'));
    const addLocalIndex = buttons.findIndex((b) => b.textContent?.trim() === 'Подключить локальный вход');
    buttons[addLocalIndex].querySelector('button')?.click();

    expect(openSpy).toHaveBeenCalledWith(AddLocalMethodModal, expect.any(Object));
    const data = openSpy.mock.calls[0][1] as AddLocalMethodModalData;
    data.onAdded();

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush(localOnlyUser);
    expect(showSpy).toHaveBeenCalledWith('Локальный вход подключён', 'success');
  });

  it('клик «Отключить» открывает ConfirmModal; успешный DELETE — GET /auth/me и toast успеха', () => {
    setCurrentUser(bothMethodsUser);
    const openSpy = vi.spyOn(modalService, 'open');
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('app-button'));
    const disconnectIndex = buttons.findIndex((b) => b.textContent?.trim() === 'Отключить');
    buttons[disconnectIndex].querySelector('button')?.click();

    expect(openSpy).toHaveBeenCalledWith(
      ConfirmModal,
      expect.objectContaining({ message: expect.stringContaining('Отключить') }),
    );
    const data = openSpy.mock.calls[0][1] as { onConfirm: () => void };
    data.onConfirm();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/LOCAL`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush(googleOnlyUser);
    expect(showSpy).toHaveBeenCalledWith('Способ входа отключён', 'success');
  });

  it('DELETE последнего метода — backend отвечает 403, toast «Нельзя отключить единственный способ входа»', () => {
    setCurrentUser(bothMethodsUser);
    const openSpy = vi.spyOn(modalService, 'open');
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('app-button'));
    const disconnectIndex = buttons.findIndex((b) => b.textContent?.trim() === 'Отключить');
    buttons[disconnectIndex].querySelector('button')?.click();

    const data = openSpy.mock.calls[0][1] as { onConfirm: () => void };
    data.onConfirm();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/LOCAL`);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(showSpy).toHaveBeenCalledWith('Нельзя отключить единственный способ входа', 'error');
  });

  it('Google не подключён — рендерит оверлей и вызывает connectButton()', () => {
    setCurrentUser(localOnlyUser);
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const overlay = el.querySelector<HTMLDivElement>('.profile-section__google-button-overlay');
    expect(overlay).not.toBeNull();
    expect(googleAuthService.connectButton).toHaveBeenCalledWith(overlay);
  });

  it('успешное подключение Google (connectButton) — GET /auth/me и toast успеха', () => {
    setCurrentUser(localOnlyUser);
    googleAuthService.connectButton.mockReturnValue(new Observable((subscriber) => subscriber.next({ success: true })));
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush(bothMethodsUser);
    expect(showSpy).toHaveBeenCalledWith('Google подключён', 'success');
  });

  it('подключаемый Google уже привязан к другому аккаунту (409) — toast с пояснением', () => {
    setCurrentUser(localOnlyUser);
    googleAuthService.connectButton.mockReturnValue(
      new Observable((subscriber) =>
        subscriber.error(
          Object.assign(new Error('Conflict'), { status: 409 }),
        ),
      ),
    );
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    expect(showSpy).toHaveBeenCalledWith(
      'Этот Google-аккаунт уже подключён к другому пользователю',
      'error',
    );
  });

  it('клик «Сменить пароль» открывает ChangePasswordModal', () => {
    setCurrentUser(localOnlyUser);
    const openSpy = vi.spyOn(modalService, 'open');
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    clickButton(el, 2);

    expect(openSpy).toHaveBeenCalledWith(ChangePasswordModal);
  });

  it('клик «Поменять» открывает AvatarPickerModal с текущим avatarUrl, onConfirm обновляет превью', () => {
    setCurrentUser(localOnlyUser);
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

  it('«Сохранить» без изменений — не бьёт в API', () => {
    setCurrentUser(localOnlyUser);
    const fixture = TestBed.createComponent(ProfileSection);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    clickButton(el, 1);

    httpMock.expectNone(`${environment.apiUrl}/profile`);
    httpMock.expectNone(`${environment.apiUrl}/profile/avatar`);
  });

  it('«Сохранить» с очищенным (ранее непустым) именем — toast-ошибка, без запроса', () => {
    setCurrentUser(localOnlyUser);
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
    setCurrentUser(localOnlyUser);
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
    req.flush({ id: '1', userId: '1', name: 'Новый ник', avatarUrl: null });

    httpMock
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush({ ...localOnlyUser, name: 'Новый ник' });

    expect(showSpy).toHaveBeenCalledWith('Профиль обновлён', 'success');
  });

  it('«Сохранить» с изменённым аватаром (выбран в модалке) — PATCH /profile/avatar, затем GET /auth/me', () => {
    setCurrentUser(localOnlyUser);
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
    req.flush({ id: '1', userId: '1', name: null, avatarUrl: '/images/avatar-presets/preset-3.svg' });

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush({
      ...localOnlyUser,
      avatarUrl: '/images/avatar-presets/preset-3.svg',
    });
  });

  it('«Сохранить» с изменёнными именем И аватаром — оба запроса разом (forkJoin)', () => {
    setCurrentUser(localOnlyUser);
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
    profileReq.flush({ id: '1', userId: '1', name: 'Новый ник', avatarUrl: null });
    avatarReq.flush({
      id: '1',
      userId: '1',
      name: 'Новый ник',
      avatarUrl: '/images/avatar-presets/preset-4.svg',
    });

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush({
      ...localOnlyUser,
      name: 'Новый ник',
      avatarUrl: '/images/avatar-presets/preset-4.svg',
    });
  });
});
