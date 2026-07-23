import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { Profile } from '@core/models/profile.model';
import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { ProfileService } from '@core/services/profile.service';
import { Button } from '@shared/components/button/button';
import { TextField } from '@shared/components/text-field/text-field';
import { AvatarPickerModal, AvatarPickerModalData } from '../avatar-picker-modal/avatar-picker-modal';
import { ChangePasswordModal } from '../change-password-modal/change-password-modal';

/**
 * Секция "Профиль" личного кабинета (stream.Front#65) — имя/фото/пароль,
 * подключается в `AccountPage` (`#64`) вместо секции-заглушки. `SectionTitle`
 * секции остаётся в `account-page.html`, этот компонент отвечает только за
 * содержимое.
 *
 * По прямому запросу пользователя (пересмотр первой версии) — имя и фото
 * сохраняются ОДНОЙ общей кнопкой «Сохранить» внизу блока, пароль — отдельным
 * immediate-save flow через свою модалку (см. `ChangePasswordModal`), никак
 * не завязанным на общую кнопку.
 *
 * **Имя/аватар — локальный "черновик" до общей кнопки «Сохранить»:**
 * `name`/`pendingAvatarUrl` инициализируются один раз из уже загруженного
 * `AuthService.currentUser()` (populate'ится при старте приложения,
 * `provideAppInitializer`, `stream.Front#14`). `savedName`/`savedAvatarUrl` —
 * "базовая линия" (что реально уже на бэке) — именно с ними, а не с
 * `currentUser()` напрямую, сравнивается черновик при клике «Сохранить»:
 * после успешного сохранения обе обновляются на новое значение,
 * `currentUser()` при этом НЕ мутируется вручную (никакого ручного merge
 * state) — вместо этого повторно вызывается уже существующий
 * `AuthService.fetchCurrentUser()` (`GET /auth/me`, уже отдаёт актуальные
 * `name`/`avatarUrl`, сам обновляет `currentUserSignal` — `Shell` реактивно
 * перерисуется без доп. кода).
 *
 * **Фото меняется через модалку** (`AvatarPickerModal`, `ModalService.open`)
 * — кнопка «Поменять» передаёт колбэк `onConfirm`, который просто пишет
 * выбранный URL в `pendingAvatarUrl` (ничего не сохраняя на бэке сразу же) —
 * реальный `ProfileService.updateAvatar()` уходит только при клике на общую
 * кнопку «Сохранить», вместе с именем (если оно тоже изменилось), одним
 * пользовательским действием (`forkJoin`, не последовательные запросы).
 *
 * **Пароль — отдельная кнопка «Сменить пароль» + своя модалка**
 * (`ChangePasswordModal`) — сохраняется НЕМЕДЛЕННО внутри самой модалки, без
 * какого-либо участия общей кнопки «Сохранить» (см. её собственный
 * компонент/комментарий).
 */
@Component({
  selector: 'app-profile-section',
  imports: [TextField, Button],
  templateUrl: './profile-section.html',
  styleUrl: './profile-section.scss',
})
export class ProfileSection {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);

  private readonly savedName = signal(this.authService.currentUser()?.name ?? '');
  private readonly savedAvatarUrl = signal(this.authService.currentUser()?.avatarUrl ?? null);

  protected readonly name = signal(this.savedName());
  protected readonly pendingAvatarUrl = signal(this.savedAvatarUrl());

  protected onChangeAvatarClick(): void {
    this.modalService.open<AvatarPickerModalData>(AvatarPickerModal, {
      currentUrl: this.pendingAvatarUrl(),
      onConfirm: (url) => this.pendingAvatarUrl.set(url),
    });
  }

  protected onChangePasswordClick(): void {
    this.modalService.open(ChangePasswordModal);
  }

  protected onSave(): void {
    const trimmedName = this.name().trim();
    const nameChanged = trimmedName !== this.savedName();
    const avatarChanged = this.pendingAvatarUrl() !== this.savedAvatarUrl();

    if (!nameChanged && !avatarChanged) {
      return;
    }

    if (nameChanged && !trimmedName) {
      this.notificationService.show('Введите отображаемое имя', 'error');
      return;
    }

    const requests: Observable<Profile>[] = [];
    if (nameChanged) {
      requests.push(this.profileService.updateProfile({ name: trimmedName }));
    }
    if (avatarChanged) {
      requests.push(this.profileService.updateAvatar({ avatarUrl: this.pendingAvatarUrl()! }));
    }

    forkJoin(requests).subscribe({
      next: () => {
        this.savedName.set(trimmedName);
        this.savedAvatarUrl.set(this.pendingAvatarUrl());
        this.authService.fetchCurrentUser().subscribe();
        this.notificationService.show('Профиль обновлён', 'success');
      },
      error: (error: HttpErrorResponse) =>
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Что-то пошло не так, попробуйте позже',
          'error',
        ),
    });
  }
}
