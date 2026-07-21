import { Component, inject, input } from '@angular/core';

import { ModalService } from '@core/services/modal.service';

/**
 * Временный демо-компонент для визуальной проверки ModalService/ModalHost
 * (stream.Front#56). Удалить перед PR — не часть скоупа задачи.
 */
@Component({
  selector: 'app-modal-demo',
  template: `
    <h2>Демо-модалка</h2>
    <p>Данные, переданные в open(): {{ data() }}</p>
    <button type="button" (click)="modalService.close()">Закрыть изнутри</button>
  `,
})
export class ModalDemo {
  protected readonly modalService = inject(ModalService);
  readonly data = input<string>('');
}
