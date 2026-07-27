import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { CurrentUser } from '@core/models/current-user.model';
import { environment } from '@env/environment';
import { AdminUser, AdminUserDetail, PaginatedResponse } from '../../services/admin-users.service';
import { AdminUsersPage } from './admin-users-page';

const currentAdmin: CurrentUser = {
  id: 'admin1',
  role: 'ADMIN',
  name: 'admin',
  avatarUrl: null,
  authMethods: [{ type: 'LOCAL' }],
};

const mockUsers: AdminUser[] = [
  { id: 'admin1', name: 'admin', role: 'ADMIN', authMethods: ['LOCAL'], createdAt: '', updatedAt: '' },
  { id: 'u2', name: 'streamer', role: 'USER', authMethods: ['LOCAL'], createdAt: '', updatedAt: '' },
];

function mockResponse(items: AdminUser[]): PaginatedResponse<AdminUser> {
  return { items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } };
}

describe('AdminUsersPage', () => {
  let httpMock: HttpTestingController;
  let authService: AuthService;

  function createComponent() {
    const fixture = TestBed.createComponent(AdminUsersPage);
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/admin/users?page=1&limit=20`)
      .flush(mockResponse(mockUsers));
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminUsersPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    (
      authService as unknown as { currentUserSignal: { set: (u: CurrentUser) => void } }
    ).currentUserSignal.set(currentAdmin);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит строки пользователей', () => {
    const fixture = createComponent();
    const el: HTMLElement = fixture.nativeElement;

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('admin');
    expect(rows[1].textContent).toContain('streamer');
  });

  it('скрывает кнопки «Изменить роль»/«Удалить» для собственной строки, оставляя «Просмотр»', () => {
    const fixture = createComponent();
    const el: HTMLElement = fixture.nativeElement;

    const rows = el.querySelectorAll('tbody tr');
    expect(rows[0].querySelectorAll('button').length).toBe(1);
    expect(rows[0].querySelector('button')?.textContent).toContain('Просмотр');
    expect(rows[1].querySelectorAll('button').length).toBe(3);
  });

  it('запрашивает следующую страницу при onLazyLoad', () => {
    const fixture = createComponent();

    fixture.componentInstance['onLazyLoad']({ first: 20, rows: 20 });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/users?page=2&limit=20`);
    req.flush(mockResponse([]));
  });

  it('меняет роль и обновляет строку без повторного GET', () => {
    const fixture = createComponent();

    fixture.componentInstance['onEditRoleClick'](mockUsers[1]);
    fixture.componentInstance['editingRole'].set('ADMIN');
    fixture.componentInstance['onSaveRoleClick']();

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/u2/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: 'ADMIN' });
    req.flush({ ...mockUsers[1], role: 'ADMIN' });

    expect(fixture.componentInstance['drawerVisible']()).toBe(false);
    expect(fixture.componentInstance['users']()[1].role).toBe('ADMIN');
  });

  it('применяет фильтры search/role и сбрасывает на страницу 1', () => {
    const fixture = createComponent();

    fixture.componentInstance['searchFilter'].set('john');
    fixture.componentInstance['roleFilter'].set('ADMIN');
    fixture.componentInstance['onFilterChange']();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/admin/users?page=1&limit=20&search=john&role=ADMIN`,
    );
    req.flush(mockResponse([]));
  });

  it('«Просмотр» загружает и показывает карточку пользователя (профиль/способы входа/аккаунты/соц-сети)', () => {
    const fixture = createComponent();
    const detail: AdminUserDetail = {
      ...mockUsers[1],
      avatarUrl: null,
      gameAccounts: [
        {
          id: 'g1',
          userId: 'u2',
          nickname: 'ProNick',
          externalId: '123',
          createdAt: '',
          updatedAt: '',
        },
      ],
      socialLinks: [
        { id: 's1', userId: 'u2', type: 'TELEGRAM', value: '@nick', createdAt: '', updatedAt: '' },
      ],
    };

    fixture.componentInstance['onViewClick'](mockUsers[1]);
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/u2`);
    expect(req.request.method).toBe('GET');
    req.flush(detail);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(fixture.componentInstance['detailDrawerVisible']()).toBe(true);
    expect(el.textContent).toContain('Локальный вход');
    expect(el.textContent).toContain('ProNick');
    expect(el.textContent).toContain('TELEGRAM: @nick');
  });

  it('удаляет пользователя после подтверждения и перезапрашивает страницу', () => {
    const fixture = createComponent();
    const modalService = TestBed.inject(ModalService);
    const openSpy = vi.spyOn(modalService, 'open');

    fixture.componentInstance['onDeleteClick'](mockUsers[1]);

    expect(openSpy).toHaveBeenCalled();
    const data = openSpy.mock.calls[0][1] as { onConfirm: () => void };
    data.onConfirm();

    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/admin/users/u2`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(mockUsers[1]);

    httpMock
      .expectOne(`${environment.apiUrl}/admin/users?page=1&limit=20`)
      .flush(mockResponse([mockUsers[0]]));
  });
});
