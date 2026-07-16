import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { Settings } from '../models/settings.model';
import { SettingsService } from './settings.service';

const mockSettings: Settings = {
  id: 'cly1a2b3c0002abcd1234efgh',
  userId: 'cly1a2b3c0000abcd1234efgh',
  theme: 'SYSTEM',
  receiveNotifications: true,
};

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getSettings() бьёт в GET /settings', () => {
    let result: Settings | undefined;
    service.getSettings().subscribe((settings) => (result = settings));

    const req = httpMock.expectOne(`${environment.apiUrl}/settings`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSettings);

    expect(result).toEqual(mockSettings);
  });

  it('updateSettings() бьёт в PATCH /settings с телом UpdateSettingsDto', () => {
    service.updateSettings({ theme: 'DARK', receiveNotifications: false }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/settings`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ theme: 'DARK', receiveNotifications: false });
    req.flush({ ...mockSettings, theme: 'DARK', receiveNotifications: false });
  });
});
