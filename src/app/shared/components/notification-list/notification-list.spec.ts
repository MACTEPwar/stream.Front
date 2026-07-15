import { TestBed } from '@angular/core/testing';

import { NotificationService } from '@core/services/notification.service';
import { NotificationList } from './notification-list';

describe('NotificationList', () => {
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationList],
    }).compileComponents();

    notificationService = TestBed.inject(NotificationService);
  });

  it('ничего не рендерит, когда очередь пуста', () => {
    const fixture = TestBed.createComponent(NotificationList);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.notification-list')).toBeNull();
  });

  it('рендерит уведомления из NotificationService', () => {
    notificationService.show('Готово', 'success');
    notificationService.show('Ошибка', 'error');

    const fixture = TestBed.createComponent(NotificationList);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const items = el.querySelectorAll('.notification-list__item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Готово');
    expect(items[1].textContent).toContain('Ошибка');
  });

  it('клик по крестику вызывает dismiss() в сервисе', () => {
    notificationService.show('Закрой меня', 'info', null);

    const fixture = TestBed.createComponent(NotificationList);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const closeButton = el.querySelector<HTMLButtonElement>('.notification-list__close');
    closeButton?.click();
    fixture.detectChanges();

    expect(notificationService.notifications()).toHaveLength(0);
  });
});
