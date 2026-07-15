import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NotificationList } from '@shared/components/notification-list/notification-list';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationList],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
