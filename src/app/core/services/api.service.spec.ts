import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('собирает полный URL из environment.apiUrl и переданного пути', () => {
    service.get('/health').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/health`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok' });
  });

  it('patch() отправляет PATCH-запрос с телом', () => {
    service.patch('/profile', { email: 'new@example.com' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ email: 'new@example.com' });
    req.flush({});
  });

  it('пробрасывает generic-ошибку сети дальше подписчику', () => {
    let receivedError: unknown;

    service.get('/health').subscribe({
      error: (error) => (receivedError = error),
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/health`);
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(receivedError).toBeTruthy();
  });
});
