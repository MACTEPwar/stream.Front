import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { AdminNewsTagService } from './admin-news-tag.service';
import { AdminNewsTag } from '../models/news.model';

const mockTag: AdminNewsTag = {
  id: 't1',
  name: 'Турниры',
  color: '#FF5733',
  createdAt: '2026-07-31T12:00:00.000Z',
  updatedAt: '2026-07-31T12:00:00.000Z',
};

describe('AdminNewsTagService', () => {
  let service: AdminNewsTagService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminNewsTagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll() бьёт в GET /news-tags', () => {
    let result: AdminNewsTag[] | undefined;
    service.getAll().subscribe((tags) => (result = tags));

    const req = httpMock.expectOne(`${environment.apiUrl}/news-tags`);
    expect(req.request.method).toBe('GET');
    req.flush([mockTag]);

    expect(result).toEqual([mockTag]);
  });

  it('create() бьёт в POST /admin/news-tags', () => {
    let result: AdminNewsTag | undefined;
    service.create({ name: 'Турниры', color: '#FF5733' }).subscribe((tag) => (result = tag));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news-tags`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Турниры', color: '#FF5733' });
    req.flush(mockTag);

    expect(result).toEqual(mockTag);
  });

  it('update() бьёт в PATCH /admin/news-tags/:id', () => {
    let result: AdminNewsTag | undefined;
    service.update('t1', { color: '#000000' }).subscribe((tag) => (result = tag));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news-tags/t1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ color: '#000000' });
    req.flush({ ...mockTag, color: '#000000' });

    expect(result?.color).toBe('#000000');
  });

  it('remove() бьёт в DELETE /admin/news-tags/:id', () => {
    let result: AdminNewsTag | undefined;
    service.remove('t1').subscribe((tag) => (result = tag));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news-tags/t1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockTag);

    expect(result).toEqual(mockTag);
  });
});
