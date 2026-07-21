import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { CurrentUser } from '../models/current-user.model';
import { AuthService } from './auth.service';

const mockUser: CurrentUser = {
  id: '1',
  login: 'streamer',
  role: 'USER',
  email: 'streamer@example.com',
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('isAuthenticated === false, пока currentUser не установлен', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('login() бьёт в POST /auth/login с withCredentials и обновляет currentUser', () => {
    service.login('streamer', 'secret').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ login: 'streamer', password: 'secret' });
    req.flush(mockUser);

    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('register() бьёт в POST /auth/register с withCredentials и обновляет currentUser', () => {
    service.register('streamer', 'secret').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ login: 'streamer', password: 'secret' });
    req.flush(mockUser);

    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('register() эмиттит ошибку и не меняет currentUser при конфликте логина (409)', () => {
    service.register('streamer', 'secret').subscribe({ error: () => undefined });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    req.flush(
      {
        statusCode: 409,
        message: 'Login already taken',
        error: 'Conflict',
        timestamp: new Date().toISOString(),
        path: '/auth/register',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('loginWithGoogle() бьёт в POST /auth/google с withCredentials и обновляет currentUser', () => {
    service.loginWithGoogle('google-id-token').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/google`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(mockUser);

    expect(service.currentUser()).toEqual(mockUser);
  });

  it('fetchCurrentUser() бьёт в GET /auth/me и обновляет currentUser при успехе', () => {
    service.fetchCurrentUser().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush(mockUser);

    expect(service.currentUser()).toEqual(mockUser);
  });

  it('fetchCurrentUser() сбрасывает currentUser в null при ошибке (истёкшая сессия)', () => {
    service.login('streamer', 'secret').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockUser);
    expect(service.currentUser()).toEqual(mockUser);

    service.fetchCurrentUser().subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(service.currentUser()).toBeNull();
  });

  it('logout() сбрасывает currentUser в null при успешном запросе', () => {
    service.login('streamer', 'secret').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockUser);

    service.logout().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);

    expect(service.currentUser()).toBeNull();
  });

  it('logout() сбрасывает currentUser в null, даже если запрос завершился ошибкой', () => {
    service.login('streamer', 'secret').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockUser);

    service.logout().subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiUrl}/auth/logout`)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(service.currentUser()).toBeNull();
  });
});
