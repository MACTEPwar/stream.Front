import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { CurrentUser } from '../models/current-user.model';
import { AuthService } from '../services/auth.service';
import { initializeAuth } from './auth.initializer';

const mockUser: CurrentUser = {
  id: '1',
  login: 'streamer',
  role: 'USER',
  email: null,
};

describe('initializeAuth', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('успешный /auth/me — заполняет currentUser, инициализация завершается без ошибки', () => {
    let completed = false;
    let errored = false;

    TestBed.runInInjectionContext(() => {
      initializeAuth().subscribe({
        complete: () => (completed = true),
        error: () => (errored = true),
      });
    });

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush(mockUser);

    expect(completed).toBe(true);
    expect(errored).toBe(false);
    expect(TestBed.inject(AuthService).currentUser()).toEqual(mockUser);
  });

  it('401 (гость) не блокирует инициализацию, currentUser остаётся null', () => {
    let completed = false;
    let errored = false;

    TestBed.runInInjectionContext(() => {
      initializeAuth().subscribe({
        complete: () => (completed = true),
        error: () => (errored = true),
      });
    });

    httpMock
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(completed).toBe(true);
    expect(errored).toBe(false);
    expect(TestBed.inject(AuthService).currentUser()).toBeNull();
  });

  it('сетевая ошибка не блокирует инициализацию, currentUser остаётся null', () => {
    let completed = false;
    let errored = false;

    TestBed.runInInjectionContext(() => {
      initializeAuth().subscribe({
        complete: () => (completed = true),
        error: () => (errored = true),
      });
    });

    httpMock
      .expectOne(`${environment.apiUrl}/auth/me`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(completed).toBe(true);
    expect(errored).toBe(false);
    expect(TestBed.inject(AuthService).currentUser()).toBeNull();
  });
});
