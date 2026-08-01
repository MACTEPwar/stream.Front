import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { NotificationService } from '@core/services/notification.service';
import { environment } from '@env/environment';
import { MultiImagePicker } from './multi-image-picker';

describe('MultiImagePicker', () => {
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MultiImagePicker],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('добавляет ссылку на изображение в список', () => {
    const fixture = TestBed.createComponent(MultiImagePicker);
    fixture.detectChanges();

    fixture.componentInstance['linkInput'].set('https://example.com/pic.png');
    fixture.componentInstance['onAddLinkClick']();

    expect(fixture.componentInstance.urls()).toEqual(['https://example.com/pic.png']);
    expect(fixture.componentInstance['linkInput']()).toBe('');
  });

  it('не добавляет некорректную ссылку и показывает toast', () => {
    const fixture = TestBed.createComponent(MultiImagePicker);
    fixture.detectChanges();
    const showSpy = vi.spyOn(notificationService, 'show');

    fixture.componentInstance['linkInput'].set('not-a-url');
    fixture.componentInstance['onAddLinkClick']();

    expect(fixture.componentInstance.urls()).toEqual([]);
    expect(showSpy).toHaveBeenCalledWith('Некорректная ссылка на изображение', 'error');
  });

  it('загружает файл через UploadService и добавляет полученный url', () => {
    const fixture = TestBed.createComponent(MultiImagePicker);
    fixture.detectChanges();

    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });
    fixture.componentInstance['onFileSelected']({ target: input } as unknown as Event);

    const req = httpMock.expectOne(`${environment.apiUrl}/upload`);
    expect(req.request.method).toBe('POST');
    req.flush({ url: '/uploads/photo.png' });

    expect(fixture.componentInstance.urls()).toEqual(['/uploads/photo.png']);
  });

  it('удаляет изображение по индексу', () => {
    const fixture = TestBed.createComponent(MultiImagePicker);
    fixture.detectChanges();
    fixture.componentInstance.urls.set(['a', 'b', 'c']);

    fixture.componentInstance['onRemoveClick'](1);

    expect(fixture.componentInstance.urls()).toEqual(['a', 'c']);
  });
});
