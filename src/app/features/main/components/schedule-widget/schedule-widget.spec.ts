import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { ScheduleDay } from '../../services/schedule.service';
import { ScheduleWidget } from './schedule-widget';

const mockSchedule: ScheduleDay[] = [
  { id: '1', weekday: 'MONDAY', isOnline: false, eventTitle: null, time: null },
  {
    id: '2',
    weekday: 'TUESDAY',
    isOnline: true,
    eventTitle: 'ПК игры: Resident Evil',
    time: '21:00',
  },
  { id: '3', weekday: 'WEDNESDAY', isOnline: false, eventTitle: null, time: null },
  { id: '4', weekday: 'THURSDAY', isOnline: false, eventTitle: null, time: null },
  { id: '5', weekday: 'FRIDAY', isOnline: false, eventTitle: null, time: null },
  { id: '6', weekday: 'SATURDAY', isOnline: false, eventTitle: null, time: null },
  { id: '7', weekday: 'SUNDAY', isOnline: false, eventTitle: null, time: null },
];

describe('ScheduleWidget', () => {
  let fixture: ComponentFixture<ScheduleWidget>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ScheduleWidget],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ScheduleWidget);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('пока запрос не завершён — показывает встроенный скелетон-прелоадер List (7 строк без текста)', async () => {
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const list = el.querySelector('app-list');
    expect(list).not.toBeNull();
    const rows = el.querySelectorAll('app-list-item');
    expect(rows).toHaveLength(7);
    rows.forEach((row) => expect(row.querySelector('.day-row__segment')?.textContent?.trim()).toBe(''));
    expect(el.querySelectorAll('.list__runner')).toHaveLength(7);

    httpMock.expectOne(`${environment.apiUrl}/schedule`).flush(mockSchedule);
  });

  it('online-день — сегменты weekday/eventTitle/time, offline — «Оффлайн»/«--:--» красным', async () => {
    await fixture.whenStable();
    httpMock.expectOne(`${environment.apiUrl}/schedule`).flush(mockSchedule);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('app-list-item');
    expect(rows).toHaveLength(7);

    const mondaySegments = rows[0].querySelectorAll('.day-row__segment');
    expect(mondaySegments[0].textContent).toBe('Пн');
    expect(mondaySegments[1].textContent).toBe('Оффлайн');
    expect(mondaySegments[2].textContent).toBe('--:--');

    const tuesdaySegments = rows[1].querySelectorAll('.day-row__segment');
    expect(tuesdaySegments[0].textContent).toBe('Вт');
    expect(tuesdaySegments[1].textContent).toBe('ПК игры: Resident Evil');
    expect(tuesdaySegments[2].textContent).toBe('21:00');
  });

  it('при ошибке запроса — показывает app-error-message вместо списка', async () => {
    await fixture.whenStable();
    httpMock
      .expectOne(`${environment.apiUrl}/schedule`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-error-message')).not.toBeNull();
    expect(el.querySelector('app-list')).toBeNull();
  });
});
