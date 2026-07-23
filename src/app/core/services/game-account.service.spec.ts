import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { GameAccount } from '../models/game-account.model';
import { GameAccountService } from './game-account.service';

const mockGameAccount: GameAccount = {
  id: 'cly1a2b3c0002abcd1234efgh',
  userId: 'cly1a2b3c0000abcd1234efgh',
  nickname: 'Streamer',
  externalId: 'steam-12345',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GameAccountService', () => {
  let service: GameAccountService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GameAccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll() бьёт в GET /profile/game-accounts', () => {
    let result: GameAccount[] | undefined;
    service.getAll().subscribe((accounts) => (result = accounts));

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`);
    expect(req.request.method).toBe('GET');
    req.flush([mockGameAccount]);

    expect(result).toEqual([mockGameAccount]);
  });

  it('create() бьёт в POST /profile/game-accounts с телом CreateGameAccountDto', () => {
    service.create({ nickname: 'Streamer', externalId: 'steam-12345' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nickname: 'Streamer', externalId: 'steam-12345' });
    req.flush(mockGameAccount);
  });

  it('update() бьёт в PATCH /profile/game-accounts/:id с телом UpdateGameAccountDto', () => {
    service.update(mockGameAccount.id, { nickname: 'NewNick' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts/${mockGameAccount.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nickname: 'NewNick' });
    req.flush({ ...mockGameAccount, nickname: 'NewNick' });
  });

  it('remove() бьёт в DELETE /profile/game-accounts/:id', () => {
    service.remove(mockGameAccount.id).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/game-accounts/${mockGameAccount.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
