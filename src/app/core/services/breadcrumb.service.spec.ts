import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { BreadcrumbService } from './breadcrumb.service';

@Component({ template: '' })
class StubPage {}

describe('BreadcrumbService', () => {
  let harness: RouterTestingHarness;
  let service: BreadcrumbService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'main', component: StubPage },
          {
            path: 'admin',
            component: StubPage,
            data: { breadcrumb: 'Панель управления' },
            children: [
              { path: 'users', component: StubPage, data: { breadcrumb: 'Пользователи' } },
            ],
          },
        ]),
      ],
    });

    service = TestBed.inject(BreadcrumbService);
    harness = await RouterTestingHarness.create();
  });

  it('пустой массив на роуте без data.breadcrumb', async () => {
    await harness.navigateByUrl('/main');

    expect(service.crumbs()).toEqual([]);
  });

  it('одна крошка на плоском роуте с data.breadcrumb', async () => {
    await harness.navigateByUrl('/admin');

    expect(service.crumbs()).toEqual(['Панель управления']);
  });

  it('несколько крошек по цепочке родитель → child', async () => {
    await harness.navigateByUrl('/admin/users');

    expect(service.crumbs()).toEqual(['Панель управления', 'Пользователи']);
  });
});
