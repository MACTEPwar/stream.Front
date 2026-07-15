import { Component, inject } from '@angular/core';

import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-notification-list',
  imports: [],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
})
export class NotificationList {
  private readonly notificationService = inject(NotificationService);

  readonly notifications = this.notificationService.notifications;

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }
}
