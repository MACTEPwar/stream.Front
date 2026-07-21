import { Component, HostListener, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import { ModalService } from '@core/services/modal.service';

@Component({
  selector: 'app-modal-host',
  imports: [NgComponentOutlet],
  templateUrl: './modal-host.html',
  styleUrl: './modal-host.scss',
})
export class ModalHost {
  protected readonly modalService = inject(ModalService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalService.activeComponent()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.modalService.close();
  }
}
