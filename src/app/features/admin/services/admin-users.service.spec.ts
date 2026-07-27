import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import {
  AdminUser,
  AdminUserDetail,
  AdminUsersService,
  PaginatedResponse,
} from './admin-users.service';

const mockUser: AdminUser = {
  id: 'u1',
  name: 'John Doe',
  role: 'USER',
  authMethods: ['LOCAL'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminUsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getUsers() бьёт в GET /admin/users с page/limit', () => {
    const mockResponse: PaginatedResponse<AdminUser> = {
      items: [mockUser],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    let result: PaginatedResponse<AdminUser> | undefined;
    service.getUsers(1, 20).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/users?page=1&limit=20`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    expect(result).toEqual(mockResponse);
  });

  it('getUsers() добавляет фильтры search/role к query-параметрам', () => {
    const mockResponse: PaginatedResponse<AdminUser> = {
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    service.getUsers(1, 20, { search: 'john', role: 'ADMIN' }).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/admin/users?page=1&limit=20&search=john&role=ADMIN`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('getUser() бьёт в GET /admin/users/:id', () => {
    const detail: AdminUserDetail = {
      ...mockUser,
      avatarUrl: null,
      gameAccounts: [],
      socialLinks: [],
    };
    let result: AdminUserDetail | undefined;
    service.getUser('u1').subscribe((user) => (result = user));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/u1`);
    expect(req.request.method).toBe('GET');
    req.flush(detail);

    expect(result).toEqual(detail);
  });

  it('updateRole() бьёт в PATCH /admin/users/:id/role', () => {
    let result: AdminUser | undefined;
    service.updateRole('u1', 'ADMIN').subscribe((user) => (result = user));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/u1/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: 'ADMIN' });
    req.flush({ ...mockUser, role: 'ADMIN' });

    expect(result?.role).toBe('ADMIN');
  });

  it('remove() бьёт в DELETE /admin/users/:id', () => {
    let result: AdminUser | undefined;
    service.remove('u1').subscribe((user) => (result = user));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/u1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockUser);

    expect(result).toEqual(mockUser);
  });
});
