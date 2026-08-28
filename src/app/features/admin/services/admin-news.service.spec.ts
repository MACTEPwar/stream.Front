import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { AdminNewsService } from './admin-news.service';
import { AdminNews, AdminNewsImage, CreateNewsPayload } from '../models/news.model';

const mockNews: AdminNews = {
  id: 'n1',
  title: 'Заголовок',
  description: 'Описание',
  publishedAt: '2026-07-31T12:00:00.000Z',
  viewCount: 0,
  likeCount: 0,
  likedByCurrentUser: null,
  viewedByCurrentUser: null,
  images: [],
  tags: [],
  cover: { type: 'none', url: null, focalPoint: null, variants: [] },
  createdAt: '2026-07-31T12:00:00.000Z',
  updatedAt: '2026-07-31T12:00:00.000Z',
};

describe('AdminNewsService', () => {
  let service: AdminNewsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminNewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('create() бьёт в POST /admin/news с телом DTO', () => {
    const payload: CreateNewsPayload = {
      title: 'Заголовок',
      description: 'Описание',
      imageUrls: ['/uploads/1.jpg'],
      tagIds: ['t1'],
    };
    let result: AdminNews | undefined;
    service.create(payload).subscribe((news) => (result = news));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockNews);

    expect(result).toEqual(mockNews);
  });

  it('getAll() бьёт в GET /news с пагинацией и опциональными фильтрами', () => {
    let result: unknown;
    service
      .getAll(2, 10, { search: 'турнир', tagId: 't1' })
      .subscribe((response) => (result = response));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/news?page=2&limit=10&search=${encodeURIComponent('турнир')}&tagId=t1`,
    );
    expect(req.request.method).toBe('GET');
    const response = { items: [mockNews], meta: { page: 2, limit: 10, total: 1, totalPages: 1 } };
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('getAll() без фильтров не добавляет search/tagId в query', () => {
    service.getAll(1, 20).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/news?page=1&limit=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it('update() бьёт в PATCH /admin/news/:id с частичным DTO', () => {
    let result: AdminNews | undefined;
    service.update('n1', { title: 'Новый заголовок' }).subscribe((news) => (result = news));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news/n1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Новый заголовок' });
    req.flush(mockNews);

    expect(result).toEqual(mockNews);
  });

  it('remove() бьёт в DELETE /admin/news/:id', () => {
    let result: AdminNews | undefined;
    service.remove('n1').subscribe((news) => (result = news));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news/n1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockNews);

    expect(result).toEqual(mockNews);
  });

  it('updateImageFocalPoint() бьёт в PATCH /admin/news/images/:id/focal-point с телом координат', () => {
    const mockImage: AdminNewsImage = {
      id: 'img-1',
      url: '/uploads/1.jpg',
      order: 0,
      focalX: 30,
      focalY: 40,
      variants: [],
    };
    let result: AdminNewsImage | undefined;
    service
      .updateImageFocalPoint('img-1', { focalX: 30, focalY: 40 })
      .subscribe((image) => (result = image));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news/images/img-1/focal-point`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ focalX: 30, focalY: 40 });
    req.flush(mockImage);

    expect(result).toEqual(mockImage);
  });
});
