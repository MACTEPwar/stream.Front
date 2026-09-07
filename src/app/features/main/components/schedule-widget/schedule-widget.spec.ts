import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, startWith } from 'rxjs';

import { environment } from '@env/environment';
import { SMALL_QUERY } from '@shared/utils/breakpoints';
import { ScheduleDay } from '../../services/schedule.service';
import { ScheduleWidget } from './schedule-widget';

function breakpointState(matches: boolean): BreakpointState {
  return { matches, breakpoints: { [SMALL_QUERY]: matches } };
}

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
  let breakpointState$: Subject<BreakpointState>;

  beforeEach(() => {
    breakpointState$ = new Subject<BreakpointState>();
    TestBed.configureTestingModule({
      imports: [ScheduleWidget],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // jsdom не реализует `matchMedia`, от которого зависит реальный
        // `BreakpointObserver` (тот же приём, что `main-carousel.spec.ts`) —
        // начальное синхронное `false` (широкая раскладка), конкретные тесты
        // переключают на компактную через `breakpointState$`.
        {
          provide: BreakpointObserver,
          useValue: { observe: () => breakpointState$.pipe(startWith(breakpointState(false))) },
        },
      ],
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
    rows.forEach((row) =>
      expect(row.querySelector('.day-row__segment')?.textContent?.trim()).toBe(''),
    );
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

  it('компактная раскладка — колонки дня/времени уже (26px/44px вместо 48px/56px на широкой) и текст в них по центру, по прямому запросу пользователя высвободить место среднему сегменту', async () => {
    breakpointState$.next(breakpointState(true));
    await fixture.whenStable();
    httpMock.expectOne(`${environment.apiUrl}/schedule`).flush(mockSchedule);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const mondaySegments = el
      .querySelectorAll('app-list-item')[0]
      .querySelectorAll('.day-row__segment');
    expect(mondaySegments[0].getAttribute('style')).toContain('width: 26px');
    expect(mondaySegments[0].getAttribute('style')).toContain('text-align: center');
    expect(mondaySegments[2].getAttribute('style')).toContain('width: 44px');
    expect(mondaySegments[2].getAttribute('style')).toContain('text-align: center');
  });

  it('широкая раскладка — колонки дня/времени остаются 48px/56px (не регрессирует существующий вид)', async () => {
    await fixture.whenStable();
    httpMock.expectOne(`${environment.apiUrl}/schedule`).flush(mockSchedule);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const mondaySegments = el
      .querySelectorAll('app-list-item')[0]
      .querySelectorAll('.day-row__segment');
    expect(mondaySegments[0].getAttribute('style')).toContain('width: 48px');
    expect(mondaySegments[0].getAttribute('style')).toContain('text-align: right');
    expect(mondaySegments[2].getAttribute('style')).toContain('width: 56px');
    expect(mondaySegments[2].getAttribute('style')).toContain('text-align: right');
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
