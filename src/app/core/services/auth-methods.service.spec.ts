import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { AuthMethod } from '../models/auth-method.model';
import { AuthMethodsService } from './auth-methods.service';

describe('AuthMethodsService', () => {
  let service: AuthMethodsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthMethodsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getMethods() бьёт в GET /auth/methods с withCredentials', () => {
    const mockMethods: AuthMethod[] = [{ type: 'LOCAL', identifier: 'streamer' }];
    let result: AuthMethod[] | undefined;
    service.getMethods().subscribe((methods) => (result = methods));

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush(mockMethods);

    expect(result).toEqual(mockMethods);
  });

  it('addLocal() бьёт в POST /auth/methods/local с телом {login, password}', () => {
    let result: { success: true } | undefined;
    service.addLocal('streamer', 'secret12').subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/local`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ login: 'streamer', password: 'secret12' });
    req.flush({ success: true });

    expect(result).toEqual({ success: true });
  });

  it('changeLocalPassword() бьёт в PATCH /auth/methods/local/password', () => {
    service
      .changeLocalPassword({ currentPassword: 'old-secret', newPassword: 'new-secret' })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/local/password`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ currentPassword: 'old-secret', newPassword: 'new-secret' });
    req.flush({ success: true });
  });

  it('connectGoogle() бьёт в POST /auth/methods/google с телом {idToken}', () => {
    service.connectGoogle('google-id-token').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/google`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ idToken: 'google-id-token' });
    req.flush({ success: true });
  });

  it('disconnect() бьёт в DELETE /auth/methods/:type', () => {
    service.disconnect('GOOGLE').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/methods/GOOGLE`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ success: true });
  });
});
