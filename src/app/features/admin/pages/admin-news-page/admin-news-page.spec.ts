import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { environment } from '@env/environment';
import { PaginatedResponse } from '../../services/admin-users.service';
import { AdminNews, AdminNewsTag } from '../../models/news.model';
import { AdminNewsPage } from './admin-news-page';

const mockTags: AdminNewsTag[] = [
  { id: 't1', name: 'Турниры', color: '#FF5733', createdAt: '', updatedAt: '' },
  { id: 't2', name: 'Анонсы', color: '#00FF00', createdAt: '', updatedAt: '' },
];

const mockNews: AdminNews = {
  id: 'n1',
  title: 'Заголовок',
  description: 'Описание',
  publishedAt: '2026-07-31T00:00:00.000Z',
  viewCount: 12,
  likeCount: 4,
  likedByCurrentUser: null,
  images: [
    { id: 'i2', url: '/uploads/2.jpg', order: 2 },
    { id: 'i1', url: '/uploads/1.jpg', order: 1 },
  ],
  tags: [mockTags[0]],
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:00:00.000Z',
};

function mockResponse(items: AdminNews[]): PaginatedResponse<AdminNews> {
  return { items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } };
}

describe('AdminNewsPage', () => {
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;

  async function createComponent(news: AdminNews[] = [mockNews], tags: AdminNewsTag[] = mockTags) {
    const fixture = TestBed.createComponent(AdminNewsPage);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/news-tags`).flush(tags);
    httpMock.expectOne(`${environment.apiUrl}/news?page=1&limit=20`).flush(mockResponse(news));
    fixture.detectChanges();
    // Первый прогон эффекта-дебаунса поиска (`isFirstSearchRun`) обязан
    // случиться ДО того, как тест начнёт менять `searchFilter` — иначе он
    // "съест" уже изменённое значение как будто это самый первый прогон и
    // не запланирует debounce вовсе.
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminNewsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('рендерит строки новостей', async () => {
    const fixture = await createComponent();
    const el: HTMLElement = fixture.nativeElement;

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Заголовок');
    expect(rows[0].textContent).toContain('Турниры');
    expect(rows[0].textContent).toContain('12 / 4');
  });

  it('запрашивает следующую страницу при onLazyLoad', async () => {
    const fixture = await createComponent();

    fixture.componentInstance['onLazyLoad']({ first: 20, rows: 20 });

    const req = httpMock.expectOne(`${environment.apiUrl}/news?page=2&limit=20`);
    req.flush(mockResponse([]));
  });

  it('поиск применяется с дебаунсом', async () => {
    vi.useFakeTimers();
    const fixture = await createComponent();

    fixture.componentInstance['searchFilter'].set('турнир');
    fixture.detectChanges();
    await fixture.whenStable();

    httpMock.expectNone(`${environment.apiUrl}/news?page=1&limit=20&search=${encodeURIComponent('турнир')}`);

    vi.advanceTimersByTime(400);

    const req = httpMock.expectOne(
      `${environment.apiUrl}/news?page=1&limit=20&search=${encodeURIComponent('турнир')}`,
    );
    req.flush(mockResponse([]));
  });

  it('фильтр по тегу применяется сразу и сбрасывает страницу на 1', async () => {
    const fixture = await createComponent();

    fixture.componentInstance['tagFilter'].set('t1');
    fixture.componentInstance['onTagFilterChange']();

    const req = httpMock.expectOne(`${environment.apiUrl}/news?page=1&limit=20&tagId=t1`);
    req.flush(mockResponse([]));
  });

  it('«Добавить» открывает drawer с пустой формой', async () => {
    const fixture = await createComponent();

    fixture.componentInstance['onAddClick']();

    expect(fixture.componentInstance['drawerVisible']()).toBe(true);
    expect(fixture.componentInstance['editingNewsId']()).toBeNull();
    expect(fixture.componentInstance['title']()).toBe('');
    expect(fixture.componentInstance['imageUrls']()).toEqual([]);
  });

  it('«Изменить» открывает drawer, предзаполненный данными новости (картинки отсортированы по order)', async () => {
    const fixture = await createComponent();

    fixture.componentInstance['onEditClick'](mockNews);

    expect(fixture.componentInstance['drawerVisible']()).toBe(true);
    expect(fixture.componentInstance['editingNewsId']()).toBe('n1');
    expect(fixture.componentInstance['title']()).toBe('Заголовок');
    expect(fixture.componentInstance['selectedTagIds']()).toEqual(['t1']);
    expect(fixture.componentInstance['imageUrls']()).toEqual(['/uploads/1.jpg', '/uploads/2.jpg']);
  });

  it('создаёт новость и перезапрашивает страницу', async () => {
    const fixture = await createComponent();

    fixture.componentInstance['onAddClick']();
    fixture.componentInstance['title'].set('Новый заголовок');
    fixture.componentInstance['description'].set('Новое описание');
    fixture.componentInstance['onSaveClick']();

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news`);
    expect(req.request.method).toBe('POST');
    req.flush(mockNews);

    expect(fixture.componentInstance['drawerVisible']()).toBe(false);
    httpMock.expectOne(`${environment.apiUrl}/news?page=1&limit=20`).flush(mockResponse([mockNews]));
  });

  it('редактирует новость через PATCH и перезапрашивает страницу', async () => {
    const fixture = await createComponent();

    fixture.componentInstance['onEditClick'](mockNews);
    fixture.componentInstance['title'].set('Обновлённый заголовок');
    fixture.componentInstance['onSaveClick']();

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news/n1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.title).toBe('Обновлённый заголовок');
    req.flush({ ...mockNews, title: 'Обновлённый заголовок' });

    expect(fixture.componentInstance['drawerVisible']()).toBe(false);
    httpMock.expectOne(`${environment.apiUrl}/news?page=1&limit=20`).flush(mockResponse([mockNews]));
  });

  it('не сохраняет и показывает toast, если заголовок или описание пусты', async () => {
    const fixture = await createComponent();
    const showSpy = vi.spyOn(notificationService, 'show');

    fixture.componentInstance['onAddClick']();
    fixture.componentInstance['onSaveClick']();

    expect(showSpy).toHaveBeenCalledWith('Заполните заголовок и описание', 'error');
    httpMock.expectNone(`${environment.apiUrl}/admin/news`);
  });

  it('удаляет новость после подтверждения и перезапрашивает страницу', async () => {
    const fixture = await createComponent();
    const modalService = TestBed.inject(ModalService);
    const openSpy = vi.spyOn(modalService, 'open');

    fixture.componentInstance['onDeleteClick'](mockNews);

    expect(openSpy).toHaveBeenCalled();
    const data = openSpy.mock.calls[0][1] as { onConfirm: () => void };
    data.onConfirm();

    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/admin/news/n1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(mockNews);

    httpMock.expectOne(`${environment.apiUrl}/news?page=1&limit=20`).flush(mockResponse([]));
  });
});
