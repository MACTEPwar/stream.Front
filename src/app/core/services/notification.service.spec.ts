import { TestBed } from '@angular/core/testing';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('добавляет уведомление в очередь через show()', () => {
    service.show('Готово', 'success');

    expect(service.notifications()).toHaveLength(1);
    expect(service.notifications()[0]).toMatchObject({ message: 'Готово', type: 'success' });
  });

  it('поддерживает несколько одновременных уведомлений', () => {
    service.show('Первое', 'info');
    service.show('Второе', 'error');

    expect(service.notifications()).toHaveLength(2);
  });

  it('скрывает уведомление автоматически по истечении durationMs', () => {
    service.show('Исчезнет', 'info', 1000);
    expect(service.notifications()).toHaveLength(1);

    vi.advanceTimersByTime(1000);

    expect(service.notifications()).toHaveLength(0);
  });

  it('не скрывает persistent-уведомление (durationMs: null) само по себе', () => {
    service.show('Останется', 'error', null);

    vi.advanceTimersByTime(60_000);

    expect(service.notifications()).toHaveLength(1);
  });

  it('dismiss() убирает конкретное уведомление по id', () => {
    const id = service.show('Первое', 'info', null);
    service.show('Второе', 'info', null);

    service.dismiss(id);

    expect(service.notifications()).toHaveLength(1);
    expect(service.notifications()[0].message).toBe('Второе');
  });

  it('dismissAll() очищает очередь целиком и отменяет отложенные таймеры', () => {
    service.show('Первое', 'info', 1000);
    service.show('Второе', 'error', null);

    service.dismissAll();
    expect(service.notifications()).toHaveLength(0);

    vi.advanceTimersByTime(1000);
    expect(service.notifications()).toHaveLength(0);
  });
});
