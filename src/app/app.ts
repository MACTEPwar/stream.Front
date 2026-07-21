import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ModalService } from '@core/services/modal.service';
import { ModalDemo } from '@shared/components/modal-host/demo/modal-demo';
import { ModalHost } from '@shared/components/modal-host/modal-host';
import { NotificationList } from '@shared/components/notification-list/notification-list';
import { Shell } from '@shared/components/shell/shell';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationList, ModalHost, Shell],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly modalService = inject(ModalService);

  // Временно для демонстрации ModalService/ModalHost (stream.Front#56) — убрать перед PR.
  protected openDemoModal(): void {
    this.modalService.open(ModalDemo, 'привет из App!');
  }
}
