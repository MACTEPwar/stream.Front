import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { AccountPage } from './account-page';

describe('AccountPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccountPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит 3 секции (профиль/игровые аккаунты/соц. сети)', () => {
    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const sections = el.querySelectorAll('.account-page__section');
    expect(sections.length).toBe(3);

    const titles = Array.from(el.querySelectorAll('h2.section-title__text')).map((h) => h.textContent);
    expect(titles).toEqual(['Профиль', 'Игровые аккаунты', 'Соц. сети']);

    expect(el.querySelector('app-profile-section')).not.toBeNull();

    const placeholders = el.querySelectorAll('.account-page__placeholder');
    expect(placeholders.length).toBe(2);
    placeholders.forEach((p) => expect(p.textContent).toContain('Здесь будет'));
  });

  it('рендерит кнопку «Выйти»', () => {
    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const logoutButton = el.querySelector('.account-page__logout-button');
    expect(logoutButton?.textContent?.trim()).toContain('Выйти');
  });

  it('клик по «Выйти» вызывает AuthService.logout() и после успеха навигирует на /main', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.account-page__logout-button button.button')?.click();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/main']);
  });
});
