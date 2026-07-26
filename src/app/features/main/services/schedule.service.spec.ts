import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { ScheduleDay, ScheduleService } from './schedule.service';

const mockSchedule: ScheduleDay[] = [
  { id: '1', weekday: 'MONDAY', isOnline: false, eventTitle: null, time: null },
  {
    id: '2',
    weekday: 'TUESDAY',
    isOnline: true,
    eventTitle: 'ПК игры: Resident Evil',
    time: '21:00',
  },
];

describe('ScheduleService', () => {
  let service: ScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getSchedule() бьёт в GET /schedule', () => {
    let result: ScheduleDay[] | undefined;
    service.getSchedule().subscribe((days) => (result = days));

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSchedule);

    expect(result).toEqual(mockSchedule);
  });

  it('update() бьёт в PATCH /schedule/:weekday', () => {
    const updated: ScheduleDay = {
      id: '1',
      weekday: 'MONDAY',
      isOnline: true,
      eventTitle: 'Совместный стрим',
      time: '19:00',
    };
    let result: ScheduleDay | undefined;
    service
      .update('MONDAY', { isOnline: true, eventTitle: 'Совместный стрим', time: '19:00' })
      .subscribe((day) => (result = day));

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule/MONDAY`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      isOnline: true,
      eventTitle: 'Совместный стрим',
      time: '19:00',
    });
    req.flush(updated);

    expect(result).toEqual(updated);
  });
});
