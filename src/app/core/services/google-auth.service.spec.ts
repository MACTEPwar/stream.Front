import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';

import { environment } from '@env/environment';
import { CurrentUser } from '../models/current-user.model';
import { GoogleAuthService } from './google-auth.service';

const mockUser: CurrentUser = {
  id: '1',
  login: 'streamer',
  role: 'USER',
  email: 'streamer@example.com',
  name: null,
  avatarUrl: null,
};

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let httpMock: HttpTestingController;
  let initializeSpy: Mock<
    (config: { client_id: string; callback: (r: { credential: string }) => void }) => void
  >;
  let promptSpy: Mock<
    (listener?: (n: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void) => void
  >;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoogleAuthService);
    httpMock = TestBed.inject(HttpTestingController);

    vi.spyOn(service as unknown as { loadScript(): Promise<void> }, 'loadScript').mockResolvedValue(
      undefined,
    );

    initializeSpy = vi.fn();
    promptSpy = vi.fn();
    window.google = {
      accounts: { id: { initialize: initializeSpy, prompt: promptSpy } },
    };
  });

  afterEach(() => {
    httpMock.verify();
    delete window.google;
  });

  it('инициализирует SDK с googleClientId из environment и логинится через AuthService по полученному ID-токену', async () => {
    let result: CurrentUser | undefined;
    service.signIn().subscribe((user) => (result = user));
    await Promise.resolve();

    expect(initializeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: environment.googleClientId }),
    );
    expect(promptSpy).toHaveBeenCalled();

    const { callback } = initializeSpy.mock.calls[0][0];
    callback({ credential: 'google-id-token' });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/google`);
    expect(req.request.body).toEqual({ googleIdToken: 'google-id-token' });
    req.flush(mockUser);

    expect(result).toEqual(mockUser);
  });

  it('попап закрыт/пропущен — ошибка отдаётся через Observable, без падения приложения', async () => {
    let error: unknown;
    service.signIn().subscribe({ error: (err) => (error = err) });
    await Promise.resolve();

    const [momentListener] = promptSpy.mock.calls[0];
    momentListener!({ isNotDisplayed: () => true, isSkippedMoment: () => false });

    expect(error).toBeInstanceOf(Error);
  });

  it('SDK не загрузился/недоступен — ошибка отдаётся через Observable, без падения приложения', async () => {
    delete window.google;

    let error: unknown;
    service.signIn().subscribe({ error: (err) => (error = err) });
    await Promise.resolve();

    expect(error).toBeInstanceOf(Error);
  });
});
