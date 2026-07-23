import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AVATAR_PRESETS } from './avatar-presets';
import { AvatarPickerModal } from './avatar-picker-modal';

describe('AvatarPickerModal', () => {
  let httpMock: HttpTestingController;
  let modalService: ModalService;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AvatarPickerModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит галерею из всех пресетов, с текущим avatarUrl подсвеченным как выбранный', () => {
    const fixture = TestBed.createComponent(AvatarPickerModal);
    fixture.componentRef.setInput('data', { currentUrl: AVATAR_PRESETS[1], onConfirm: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const presetButtons = el.querySelectorAll('.avatar-picker-modal__preset');
    expect(presetButtons.length).toBe(AVATAR_PRESETS.length);
    expect(presetButtons[1].classList).toContain('avatar-picker-modal__preset--active');
  });

  it('клик по пресету — выбирает его локально (без запроса к API)', () => {
    const fixture = TestBed.createComponent(AvatarPickerModal);
    fixture.componentRef.setInput('data', { currentUrl: null, onConfirm: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelectorAll<HTMLButtonElement>('.avatar-picker-modal__preset')[2].click();
    fixture.detectChanges();

    const presetButtons = el.querySelectorAll('.avatar-picker-modal__preset');
    expect(presetButtons[2].classList).toContain('avatar-picker-modal__preset--active');
    httpMock.expectNone(`${environment.apiUrl}/upload`);
  });

  it('«Выбрать» — вызывает data.onConfirm с выбранным url и закрывает модалку', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const onConfirm = vi.fn();
    const fixture = TestBed.createComponent(AvatarPickerModal);
    fixture.componentRef.setInput('data', { currentUrl: null, onConfirm });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelectorAll<HTMLButtonElement>('.avatar-picker-modal__preset')[0].click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(onConfirm).toHaveBeenCalledWith(AVATAR_PRESETS[0]);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('«Отмена» — закрывает модалку без вызова onConfirm', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const onConfirm = vi.fn();
    const fixture = TestBed.createComponent(AvatarPickerModal);
    fixture.componentRef.setInput('data', { currentUrl: null, onConfirm });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('app-button button.button');
    buttons[1].click();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('загрузка файла — POST /upload, при успехе «Выбрать» отдаёт загруженный url', () => {
    const onConfirm = vi.fn();
    const fixture = TestBed.createComponent(AvatarPickerModal);
    fixture.componentRef.setInput('data', { currentUrl: null, onConfirm });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const fileInput = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['bytes'], 'avatar.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));

    const req = httpMock.expectOne(`${environment.apiUrl}/upload`);
    expect(req.request.method).toBe('POST');
    req.flush({ url: '/uploads/avatar.png' });
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('app-button button.button')?.click();

    expect(onConfirm).toHaveBeenCalledWith('/uploads/avatar.png');
  });

  it('ошибка загрузки файла — показывает toast, не меняет выбор', () => {
    const showSpy = vi.spyOn(notificationService, 'show');
    const fixture = TestBed.createComponent(AvatarPickerModal);
    fixture.componentRef.setInput('data', { currentUrl: null, onConfirm: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const fileInput = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['bytes'], 'avatar.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));

    const req = httpMock.expectOne(`${environment.apiUrl}/upload`);
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(showSpy).toHaveBeenCalledWith('Не удалось загрузить файл, попробуйте позже', 'error');
  });
});
