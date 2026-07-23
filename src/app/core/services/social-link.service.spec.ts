import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { SocialLink } from '../models/social-link.model';
import { SocialLinkService } from './social-link.service';

const mockSocialLink: SocialLink = {
  id: 'clz1a2b3c0002abcd1234efgh',
  userId: 'clz1a2b3c0000abcd1234efgh',
  type: 'TELEGRAM',
  value: '@streamer',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('SocialLinkService', () => {
  let service: SocialLinkService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SocialLinkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll() бьёт в GET /profile/social-links', () => {
    let result: SocialLink[] | undefined;
    service.getAll().subscribe((links) => (result = links));

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links`);
    expect(req.request.method).toBe('GET');
    req.flush([mockSocialLink]);

    expect(result).toEqual([mockSocialLink]);
  });

  it('create() бьёт в POST /profile/social-links с телом CreateSocialLinkDto', () => {
    service.create({ type: 'TELEGRAM', value: '@streamer' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'TELEGRAM', value: '@streamer' });
    req.flush(mockSocialLink);
  });

  it('update() бьёт в PATCH /profile/social-links/:id с телом UpdateSocialLinkDto', () => {
    service.update(mockSocialLink.id, { value: '@newhandle' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links/${mockSocialLink.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ value: '@newhandle' });
    req.flush({ ...mockSocialLink, value: '@newhandle' });
  });

  it('remove() бьёт в DELETE /profile/social-links/:id', () => {
    service.remove(mockSocialLink.id).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/profile/social-links/${mockSocialLink.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
