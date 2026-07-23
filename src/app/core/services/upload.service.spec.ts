import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('upload() бьёт в POST /upload с withCredentials и FormData, содержащим файл', () => {
    const file = new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' });
    let result: { url: string } | undefined;
    service.upload(file).subscribe((response) => (result = response));

    const req = httpMock.expectOne(`${environment.apiUrl}/upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);

    req.flush({ url: '/uploads/avatar.png' });
    expect(result).toEqual({ url: '/uploads/avatar.png' });
  });
});
