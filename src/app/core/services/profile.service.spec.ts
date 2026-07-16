import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { Profile } from '../models/profile.model';
import { ProfileService } from './profile.service';

const mockProfile: Profile = {
  id: 'cly1a2b3c0001abcd1234efgh',
  userId: 'cly1a2b3c0000abcd1234efgh',
  email: 'streamer@example.com',
};

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getProfile() бьёт в GET /profile', () => {
    let result: Profile | undefined;
    service.getProfile().subscribe((profile) => (result = profile));

    const req = httpMock.expectOne(`${environment.apiUrl}/profile`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);

    expect(result).toEqual(mockProfile);
  });

  it('updateProfile() бьёт в PATCH /profile с телом UpdateProfileDto', () => {
    service.updateProfile({ email: 'new@example.com' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ email: 'new@example.com' });
    req.flush({ ...mockProfile, email: 'new@example.com' });
  });
});
