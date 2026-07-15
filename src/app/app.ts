import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NotificationList } from '@shared/components/notification-list/notification-list';
import { Shell } from '@shared/components/shell/shell';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationList, Shell],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
