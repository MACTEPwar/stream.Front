import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { environment } from '@env/environment';
import { AdminNewsTag } from '../../models/news.model';
import { AdminNewsTagsPage } from './admin-news-tags-page';

const mockTags: AdminNewsTag[] = [
  { id: 't1', name: 'Турниры', color: '#FF5733', createdAt: '', updatedAt: '' },
  { id: 't2', name: 'Анонсы', color: '#00FF00', createdAt: '', updatedAt: '' },
];

describe('AdminNewsTagsPage', () => {
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;

  function createComponent() {
    const fixture = TestBed.createComponent(AdminNewsTagsPage);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/news-tags`).flush(mockTags);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminNewsTagsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит строки тегов', () => {
    const fixture = createComponent();
    const el: HTMLElement = fixture.nativeElement;

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Турниры');
    expect(rows[1].textContent).toContain('Анонсы');
  });

  it('«Добавить» открывает drawer с пустой формой', () => {
    const fixture = createComponent();

    fixture.componentInstance['onAddClick']();

    expect(fixture.componentInstance['drawerVisible']()).toBe(true);
    expect(fixture.componentInstance['editingTagId']()).toBeNull();
    expect(fixture.componentInstance['name']()).toBe('');
  });

  it('создаёт тег и добавляет его в список', () => {
    const fixture = createComponent();

    fixture.componentInstance['onAddClick']();
    fixture.componentInstance['name'].set('Стримы');
    fixture.componentInstance['color'].set('#123456');
    fixture.componentInstance['onSaveClick']();

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news-tags`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Стримы', color: '#123456' });
    req.flush({ id: 't3', name: 'Стримы', color: '#123456', createdAt: '', updatedAt: '' });

    expect(fixture.componentInstance['drawerVisible']()).toBe(false);
    expect(fixture.componentInstance['tags']().length).toBe(3);
  });

  it('редактирует тег и обновляет строку без повторного GET', () => {
    const fixture = createComponent();

    fixture.componentInstance['onEditClick'](mockTags[0]);
    fixture.componentInstance['color'].set('#000000');
    fixture.componentInstance['onSaveClick']();

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news-tags/t1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Турниры', color: '#000000' });
    req.flush({ ...mockTags[0], color: '#000000' });

    expect(fixture.componentInstance['tags']()[0].color).toBe('#000000');
  });

  it('удаляет тег после подтверждения', () => {
    const fixture = createComponent();
    const modalService = TestBed.inject(ModalService);
    const openSpy = vi.spyOn(modalService, 'open');

    fixture.componentInstance['onDeleteClick'](mockTags[0]);

    expect(openSpy).toHaveBeenCalled();
    const data = openSpy.mock.calls[0][1] as { onConfirm: () => void };
    data.onConfirm();

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news-tags/t1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockTags[0]);

    expect(fixture.componentInstance['tags']().length).toBe(1);
  });

  it('фильтрует строки по названию на фронте, без запроса на backend', () => {
    const fixture = createComponent();

    fixture.componentInstance['searchFilter'].set('анонс');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Анонсы');
    httpMock.expectNone(`${environment.apiUrl}/news-tags?search=%D0%B0%D0%BD%D0%BE%D0%BD%D1%81`);
  });

  it('не сохраняет и показывает toast, если название пусто', () => {
    const fixture = createComponent();
    const showSpy = vi.spyOn(notificationService, 'show');

    fixture.componentInstance['onAddClick']();
    fixture.componentInstance['onSaveClick']();

    expect(showSpy).toHaveBeenCalledWith('Заполните название и цвет', 'error');
    httpMock.expectNone(`${environment.apiUrl}/admin/news-tags`);
  });
});
