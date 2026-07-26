import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AdminPage } from './admin-page';
import { AdminSchedulePage } from '../admin-schedule-page/admin-schedule-page';
import { AdminUsersPage } from '../admin-users-page/admin-users-page';

describe('AdminPage', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'admin',
            component: AdminPage,
            data: { breadcrumb: 'Панель управления' },
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'schedule' },
              {
                path: 'schedule',
                component: AdminSchedulePage,
                data: { breadcrumb: 'Расписание' },
              },
              { path: 'users', component: AdminUsersPage, data: { breadcrumb: 'Пользователи' } },
            ],
          },
        ]),
      ],
    });

    harness = await RouterTestingHarness.create();
  });

  it('рендерит 2 пункта сайдбар-меню (Расписание/Пользователи)', async () => {
    await harness.navigateByUrl('/admin/schedule');

    const el: HTMLElement = harness.routeNativeElement!;
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.admin-page__nav-link'));
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Расписание', 'Пользователи']);
  });

  it('пустой /admin редиректит на /admin/schedule', async () => {
    await harness.navigateByUrl('/admin');

    const el: HTMLElement = harness.routeNativeElement!;
    expect(el.querySelector('app-admin-schedule-page')).not.toBeNull();
  });

  it('рендерит breadcrumbs по цепочке родитель → активный child', async () => {
    await harness.navigateByUrl('/admin/users');

    const el: HTMLElement = harness.routeNativeElement!;
    const crumbs = Array.from(el.querySelectorAll('.admin-page__breadcrumb')).map((crumb) =>
      crumb.textContent?.trim(),
    );
    expect(crumbs).toEqual(['Панель управления', 'Пользователи']);
  });

  it('подсвечивает активный пункт меню текущего раздела', async () => {
    await harness.navigateByUrl('/admin/users');

    const el: HTMLElement = harness.routeNativeElement!;
    const activeLink = el.querySelector('.admin-page__nav-link--active');
    expect(activeLink?.textContent?.trim()).toBe('Пользователи');
  });

  it('рендерит содержимое активного child-роута в content area', async () => {
    await harness.navigateByUrl('/admin/schedule');

    const el: HTMLElement = harness.routeNativeElement!;
    expect(el.querySelector('.admin-page__content app-admin-schedule-page')).not.toBeNull();
  });

  it('группа «Справочники» развёрнута по умолчанию и сворачивается по клику (stream.Front#77)', async () => {
    await harness.navigateByUrl('/admin/schedule');

    const el: HTMLElement = harness.routeNativeElement!;
    expect(el.querySelector('.admin-page__nav-group-header')?.textContent).toContain('Справочники');
    expect(el.querySelectorAll('.admin-page__nav-link').length).toBe(2);

    el.querySelector<HTMLButtonElement>('.admin-page__nav-group-header')?.click();
    harness.detectChanges();

    expect(el.querySelectorAll('.admin-page__nav-link').length).toBe(0);

    el.querySelector<HTMLButtonElement>('.admin-page__nav-group-header')?.click();
    harness.detectChanges();

    expect(el.querySelectorAll('.admin-page__nav-link').length).toBe(2);
  });
});
