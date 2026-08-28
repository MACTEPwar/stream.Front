import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationService } from '@core/services/notification.service';
import { environment } from '@env/environment';
import { CoverPicker, CoverPickerValue } from './cover-picker';

@Component({
  selector: 'app-cover-picker-host',
  imports: [CoverPicker],
  template: `<app-cover-picker
    [imageUrls]="imageUrls()"
    [value]="value()"
    (valueChange)="onValueChange($event)"
  />`,
})
class CoverPickerHost {
  readonly imageUrls = signal<string[]>(['/uploads/a.jpg', '/uploads/b.jpg']);
  readonly value = signal<CoverPickerValue>({ type: 'none', url: null });
  readonly emitted: CoverPickerValue[] = [];

  onValueChange(value: CoverPickerValue): void {
    this.emitted.push(value);
    // Тот же приём, что реальные потребители (`AdminNewsPage`,
    // `PinnedGridEditor`): родитель решает сам, применять ли выбор, здесь —
    // применяем сразу, чтобы проверять цепочку кликов без ручного `.set()`
    // между каждым.
    this.value.set(value);
  }
}

describe('CoverPicker', () => {
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CoverPickerHost],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createPicker() {
    const fixture = TestBed.createComponent(CoverPickerHost);
    fixture.detectChanges();
    return fixture;
  }

  function radio(host: HTMLElement, label: string): HTMLInputElement {
    const match = Array.from(host.querySelectorAll('.cover-picker__option')).find((el) =>
      el.textContent?.includes(label),
    );
    return match?.querySelector('input[type="radio"]') as HTMLInputElement;
  }

  /** `linkInput`/`onFileSelected`/`onAddLinkClick` — приватные члены самого `CoverPicker`, не хоста; тот же приём прямого доступа через `componentInstance`, что `MultiImagePicker.spec.ts`. */
  function coverPicker(fixture: ComponentFixture<CoverPickerHost>): CoverPicker {
    return fixture.debugElement.query((node) => node.componentInstance instanceof CoverPicker)
      .componentInstance as CoverPicker;
  }

  it('вариант «одно из изображений» скрыт, когда у новости нет картинок (ОБЛ-Ф-03)', () => {
    const fixture = createPicker();
    fixture.componentInstance.imageUrls.set([]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(radio(host, 'Одно из изображений')).toBeUndefined();
    expect(radio(host, 'Нет обложки')).not.toBeUndefined();
    expect(radio(host, 'Своя')).not.toBeUndefined();
  });

  it('показывает сам набор картинок при выборе «одно из изображений» (ОБЛ-Ф-02), не список имён', () => {
    const fixture = createPicker();
    const host = fixture.nativeElement as HTMLElement;

    radio(host, 'Одно из изображений').click();
    fixture.detectChanges();

    const thumbs = host.querySelectorAll<HTMLElement>('.cover-picker__thumb img');
    expect(thumbs.length).toBe(2);
    expect((thumbs[0] as HTMLImageElement).src).toContain('/uploads/a.jpg');
  });

  it('переключение на «одно из изображений» без клика по миниатюре не эмитит url — только тип', () => {
    const fixture = createPicker();
    const host = fixture.nativeElement as HTMLElement;

    radio(host, 'Одно из изображений').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emitted).toEqual([{ type: 'image', url: null }]);
  });

  it('клик по миниатюре эмитит {type: image, url} и подсвечивает выбранную', () => {
    const fixture = createPicker();
    const host = fixture.nativeElement as HTMLElement;

    radio(host, 'Одно из изображений').click();
    fixture.detectChanges();
    const thumbs = host.querySelectorAll<HTMLElement>('.cover-picker__thumb');
    thumbs[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emitted.at(-1)).toEqual({
      type: 'image',
      url: '/uploads/b.jpg',
    });
    expect(host.querySelectorAll('.cover-picker__thumb')[1].classList).toContain(
      'cover-picker__thumb--selected',
    );
    expect(host.querySelectorAll('.cover-picker__thumb')[0].classList).not.toContain(
      'cover-picker__thumb--selected',
    );
  });

  it('миниатюры несут доступное имя и aria-pressed по выбранному состоянию (a11y-review)', () => {
    const fixture = createPicker();
    const host = fixture.nativeElement as HTMLElement;

    radio(host, 'Одно из изображений').click();
    fixture.detectChanges();
    const thumbs = host.querySelectorAll<HTMLElement>('.cover-picker__thumb');

    expect(thumbs[0].getAttribute('aria-label')).toBe('Изображение 1 из 2');
    expect(thumbs[1].getAttribute('aria-label')).toBe('Изображение 2 из 2');
    expect(thumbs[0].getAttribute('aria-pressed')).toBe('false');

    thumbs[0].click();
    fixture.detectChanges();

    expect(host.querySelectorAll('.cover-picker__thumb')[0].getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('переключение на «нет обложки» эмитит {type: none, url: null} сразу', () => {
    const fixture = createPicker();
    fixture.componentInstance.value.set({ type: 'custom', url: '/uploads/x.jpg' });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    radio(host, 'Нет обложки').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emitted.at(-1)).toEqual({ type: 'none', url: null });
  });

  it('повторный клик по уже выбранному типу ничего не эмитит', () => {
    const fixture = createPicker();
    const host = fixture.nativeElement as HTMLElement;

    radio(host, 'Нет обложки').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emitted).toEqual([]);
  });

  it('добавляет свою обложку по ссылке (ОБЛ-О-02)', () => {
    const fixture = createPicker();
    const host = fixture.nativeElement as HTMLElement;

    radio(host, 'Своя').click();
    fixture.detectChanges();

    const picker = coverPicker(fixture);
    picker['linkInput'].set('https://example.com/pic.png');
    picker['onAddLinkClick']();

    expect(fixture.componentInstance.emitted.at(-1)).toEqual({
      type: 'custom',
      url: 'https://example.com/pic.png',
    });
  });

  it('не добавляет некорректную ссылку и показывает toast', () => {
    const fixture = createPicker();
    const showSpy = vi.spyOn(notificationService, 'show');
    const picker = coverPicker(fixture);

    picker['linkInput'].set('not-a-url');
    picker['onAddLinkClick']();

    expect(fixture.componentInstance.emitted).toEqual([]);
    expect(showSpy).toHaveBeenCalledWith('Некорректная ссылка на изображение', 'error');
  });

  it('загружает файл через UploadService и эмитит {type: custom, url}', () => {
    const fixture = createPicker();
    const picker = coverPicker(fixture);

    const file = new File(['content'], 'cover.png', { type: 'image/png' });
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });
    picker['onFileSelected']({ target: input } as unknown as Event);

    const req = httpMock.expectOne(`${environment.apiUrl}/upload`);
    req.flush({ url: '/uploads/cover.png' });

    expect(fixture.componentInstance.emitted.at(-1)).toEqual({
      type: 'custom',
      url: '/uploads/cover.png',
    });
  });
});
