import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, HostListener, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgComponentOutlet } from '@angular/common';
import { map } from 'rxjs';

import { ModalService } from '@core/services/modal.service';
import { SMALL_QUERY } from '@shared/utils/breakpoints';

@Component({
  selector: 'app-modal-host',
  imports: [NgComponentOutlet],
  templateUrl: './modal-host.html',
  styleUrl: './modal-host.scss',
})
export class ModalHost {
  protected readonly modalService = inject(ModalService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly isSmallViewport = toSignal(
    this.breakpointObserver.observe(SMALL_QUERY).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  /**
   * `'sheet-on-mobile'`-модалка (`ModalService.activePresentation()`, сейчас
   * только `NewsDetailModal`) на `small`-вьюпорте показывается нижней
   * шторкой вместо центральной панели (`stream.Front#122`) — `ModalHost`
   * остаётся общим слотом без знания о конкретных модалках-потребителях,
   * решение "хочет ли ЭТА модалка альтернативную мобильную презентацию"
   * приходит от вызывающего кода через `ModalService.open()`.
   */
  protected readonly isSheetVariant = computed(
    () => this.modalService.activePresentation() === 'sheet-on-mobile' && this.isSmallViewport(),
  );

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
