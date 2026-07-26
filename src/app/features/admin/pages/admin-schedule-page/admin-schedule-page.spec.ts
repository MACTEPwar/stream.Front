import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { NotificationService } from '@core/services/notification.service';
import { environment } from '@env/environment';
import { ScheduleDay } from '../../../main/services/schedule.service';
import { AdminSchedulePage } from './admin-schedule-page';

const mockSchedule: ScheduleDay[] = [
  { id: '1', weekday: 'MONDAY', isOnline: false, eventTitle: null, time: null },
  { id: '2', weekday: 'TUESDAY', isOnline: true, eventTitle: 'ПК игры', time: '21:00' },
  { id: '3', weekday: 'WEDNESDAY', isOnline: false, eventTitle: null, time: null },
  { id: '4', weekday: 'THURSDAY', isOnline: false, eventTitle: null, time: null },
  { id: '5', weekday: 'FRIDAY', isOnline: false, eventTitle: null, time: null },
  { id: '6', weekday: 'SATURDAY', isOnline: false, eventTitle: null, time: null },
  { id: '7', weekday: 'SUNDAY', isOnline: false, eventTitle: null, time: null },
];

describe('AdminSchedulePage', () => {
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;

  function createComponent() {
    const fixture = TestBed.createComponent(AdminSchedulePage);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/schedule`).flush(mockSchedule);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminSchedulePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('рендерит 7 строк в порядке Пн→Вс', () => {
    const fixture = createComponent();
    const el: HTMLElement = fixture.nativeElement;

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(7);
    expect(rows[0].textContent).toContain('Понедельник');
    expect(rows[1].textContent).toContain('Вторник');
    expect(rows[6].textContent).toContain('Воскресенье');
  });

  it('открывает drawer с предзаполненной формой по клику «Изменить»', () => {
    const fixture = createComponent();
    const el: HTMLElement = fixture.nativeElement;

    el.querySelectorAll<HTMLButtonElement>('tbody button')[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance['editingWeekday']()).toBe('TUESDAY');
    expect(fixture.componentInstance['eventTitle']()).toBe('ПК игры');
    expect(fixture.componentInstance['time']()).toBe('21:00');
  });

  it('не отправляет PATCH и показывает toast при невалидном формате времени', () => {
    const fixture = createComponent();
    const showSpy = vi.spyOn(notificationService, 'show');

    fixture.componentInstance['onEditClick'](mockSchedule[1]);
    fixture.componentInstance['time'].set('25:99');
    fixture.componentInstance['onSaveClick']();

    expect(showSpy).toHaveBeenCalledWith('Время должно быть в формате ЧЧ:ММ', 'error');
    httpMock.expectNone(`${environment.apiUrl}/schedule/TUESDAY`);
  });

  it('сохраняет и обновляет строку без повторного GET', () => {
    const fixture = createComponent();

    fixture.componentInstance['onEditClick'](mockSchedule[0]);
    fixture.componentInstance['isOnline'].set(true);
    fixture.componentInstance['eventTitle'].set('Совместный стрим');
    fixture.componentInstance['time'].set('19:00');
    fixture.componentInstance['onSaveClick']();

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule/MONDAY`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      isOnline: true,
      eventTitle: 'Совместный стрим',
      time: '19:00',
    });
    req.flush({
      id: '1',
      weekday: 'MONDAY',
      isOnline: true,
      eventTitle: 'Совместный стрим',
      time: '19:00',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance['drawerVisible']()).toBe(false);
    expect(fixture.componentInstance['days']()[0]).toEqual({
      id: '1',
      weekday: 'MONDAY',
      isOnline: true,
      eventTitle: 'Совместный стрим',
      time: '19:00',
    });
  });
});
