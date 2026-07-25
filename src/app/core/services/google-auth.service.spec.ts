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
  let renderButtonSpy: Mock<
    (
      parent: HTMLElement,
      config: { type?: string; theme?: string; size?: string; width?: number },
    ) => void
  >;
  let container: HTMLDivElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoogleAuthService);
    httpMock = TestBed.inject(HttpTestingController);
    container = document.createElement('div');

    vi.spyOn(service as unknown as { loadScript(): Promise<void> }, 'loadScript').mockResolvedValue(
      undefined,
    );

    initializeSpy = vi.fn();
    renderButtonSpy = vi.fn();
    window.google = {
      accounts: { id: { initialize: initializeSpy, renderButton: renderButtonSpy } },
    };
  });

  afterEach(() => {
    httpMock.verify();
    delete window.google;
  });

  it('рендерит кнопку в переданный контейнер и логинится через AuthService по полученному ID-токену', async () => {
    let result: CurrentUser | undefined;
    service.renderButton(container).subscribe((user) => (result = user));
    await Promise.resolve();

    expect(initializeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: environment.googleClientId }),
    );
    expect(renderButtonSpy).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ type: 'standard' }),
    );

    const { callback } = initializeSpy.mock.calls[0][0];
    callback({ credential: 'google-id-token' });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/google`);
    expect(req.request.body).toEqual({ googleIdToken: 'google-id-token' });
    req.flush(mockUser);

    expect(result).toEqual(mockUser);
  });

  it('повторный вызов renderButton не переинициализирует SDK', async () => {
    service.renderButton(container).subscribe();
    await Promise.resolve();

    const otherContainer = document.createElement('div');
    service.renderButton(otherContainer).subscribe();
    await Promise.resolve();

    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(renderButtonSpy).toHaveBeenCalledTimes(2);
    expect(renderButtonSpy).toHaveBeenLastCalledWith(otherContainer, expect.anything());
  });

  it('каждая подписка получает ровно один результат (take(1)) и не подхватывает чужие эмиты', async () => {
    const results: CurrentUser[] = [];
    service.renderButton(container).subscribe((user) => results.push(user));
    await Promise.resolve();

    const { callback } = initializeSpy.mock.calls[0][0];
    callback({ credential: 'first-token' });
    httpMock.expectOne(`${environment.apiUrl}/auth/google`).flush(mockUser);

    callback({ credential: 'second-token' });
    httpMock.expectNone(`${environment.apiUrl}/auth/google`);

    expect(results).toEqual([mockUser]);
  });

  it('пользователь закрыл попап без входа — Observable просто не эмитит (не ошибка)', async () => {
    const next = vi.fn();
    const error = vi.fn();
    service.renderButton(container).subscribe({ next, error });
    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    httpMock.expectNone(`${environment.apiUrl}/auth/google`);
  });

  it('SDK не загрузился/недоступен — ошибка отдаётся через Observable, без падения приложения', async () => {
    delete window.google;

    let error: unknown;
    service.renderButton(container).subscribe({ error: (err) => (error = err) });
    await Promise.resolve();

    expect(error).toBeInstanceOf(Error);
  });
});
