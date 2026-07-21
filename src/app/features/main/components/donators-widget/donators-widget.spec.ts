import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { Donator } from '../../services/donators.service';
import { DonatorsWidget } from './donators-widget';

const mockDonators: Donator[] = [
  { nickname: 'Лексик.З', amount: 79816 },
  { nickname: '-=AnGeL=-', amount: 18850 },
  { nickname: 'Михайло', amount: 17319 },
  { nickname: 'D.I.G.G.I', amount: 11160 },
  { nickname: 'D.I.I.G.I', amount: 5000 },
];

describe('DonatorsWidget', () => {
  let fixture: ComponentFixture<DonatorsWidget>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DonatorsWidget],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DonatorsWidget);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('пока запрос не завершён — показывает встроенный скелетон-прелоадер List (5 строк без текста)', async () => {
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const list = el.querySelector('app-list');
    expect(list).not.toBeNull();
    const rows = el.querySelectorAll('app-list-item');
    expect(rows).toHaveLength(5);
    rows.forEach((row) => expect(row.querySelector('.day-row__segment')?.textContent?.trim()).toBe(''));
    expect(el.querySelectorAll('.list__runner')).toHaveLength(5);

    httpMock.expectOne(`${environment.apiUrl}/donators/top`).flush(mockDonators);
  });

  it('рендерит по строке на донатера — ник слева, сумма с разделителем тысяч и ₴ справа', async () => {
    await fixture.whenStable();
    httpMock.expectOne(`${environment.apiUrl}/donators/top`).flush(mockDonators);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('app-list-item');
    expect(rows).toHaveLength(5);

    const first = rows[0].querySelectorAll('.day-row__segment');
    expect(first[0].textContent).toBe('Лексик.З');
    expect(first[1].textContent).toBe('79,816₴');

    const last = rows[4].querySelectorAll('.day-row__segment');
    expect(last[0].textContent).toBe('D.I.I.G.I');
    expect(last[1].textContent).toBe('5,000₴');
  });

  it('при ошибке запроса — показывает app-error-message вместо списка', async () => {
    await fixture.whenStable();
    httpMock
      .expectOne(`${environment.apiUrl}/donators/top`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-error-message')).not.toBeNull();
    expect(el.querySelector('app-list')).toBeNull();
  });

  it('пустой ответ — показывает собственный empty-текст вместо списка', async () => {
    await fixture.whenStable();
    httpMock.expectOne(`${environment.apiUrl}/donators/top`).flush([]);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.donators-widget__empty')).not.toBeNull();
    expect(el.querySelector('app-list')).toBeNull();
  });
});
