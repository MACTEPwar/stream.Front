import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { NotificationService } from '../services/notification.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('401 на обычном запросе триггерит logout(), показывает уведомление и пробрасывает ошибку дальше', () => {
    let receivedError: HttpErrorResponse | undefined;

    http.get(`${environment.apiUrl}/protected`).subscribe({
      error: (error) => (receivedError = error),
    });

    httpMock
      .expectOne(`${environment.apiUrl}/protected`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);

    expect(receivedError?.status).toBe(401);
    expect(TestBed.inject(NotificationService).notifications()).toHaveLength(1);
  });

  it('401 от /auth/me не триггерит logout() — это ожидаемое состояние "гость"', () => {
    http.get(`${environment.apiUrl}/auth/me`).subscribe({ error: () => undefined });

    httpMock
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone(`${environment.apiUrl}/auth/logout`);
    expect(TestBed.inject(NotificationService).notifications()).toHaveLength(0);
  });

  it('401 от /auth/logout не триггерит повторный logout() (защита от цикла)', () => {
    http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => undefined });

    httpMock
      .expectOne(`${environment.apiUrl}/auth/logout`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone(`${environment.apiUrl}/auth/logout`);
  });

  it('не-401 ошибка не триггерит logout()', () => {
    http.get(`${environment.apiUrl}/protected`).subscribe({ error: () => undefined });

    httpMock
      .expectOne(`${environment.apiUrl}/protected`)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    httpMock.expectNone(`${environment.apiUrl}/auth/logout`);
  });
});
