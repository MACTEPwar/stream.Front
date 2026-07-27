import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Observable, forkJoin } from 'rxjs';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { AUTH_METHOD_TYPE_LABELS, AuthMethodType } from '@core/models/auth-method.model';
import { Profile } from '@core/models/profile.model';
import { AuthMethodsService } from '@core/services/auth-methods.service';
import { AuthService } from '@core/services/auth.service';
import { GoogleAuthService } from '@core/services/google-auth.service';
import { ImageUrlService } from '@core/services/image-url.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { ProfileService } from '@core/services/profile.service';
import { Button } from '@shared/components/button/button';
import { ConfirmModal, ConfirmModalData } from '@shared/components/confirm-modal/confirm-modal';
import { TextField } from '@shared/components/text-field/text-field';
import { AddLocalMethodModal } from '../add-local-method-modal/add-local-method-modal';
import { AvatarPickerModal, AvatarPickerModalData } from '../avatar-picker-modal/avatar-picker-modal';
import { ChangePasswordModal } from '../change-password-modal/change-password-modal';

/**
 * Секция "Профиль" личного кабинета (stream.Front#65) — имя/фото/способы
 * входа, подключается в `AccountPage` (`#64`) вместо секции-заглушки.
 * `SectionTitle` секции остаётся в `account-page.html`, этот компонент
 * отвечает только за содержимое.
 *
 * По прямому запросу пользователя (пересмотр первой версии) — имя и фото
 * сохраняются ОДНОЙ общей кнопкой «Сохранить» внизу блока, способы входа —
 * отдельный блок ниже, никак не завязанный на общую кнопку.
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
 * **Способы входа** (`stream.Front#82`, поверх `streamer.API#63`) — блок
 * заменил одиночную кнопку «Сменить пароль»: рендерится реактивно по
 * `authService.currentUser()?.authMethods` (уже приходит вместе с
 * `GET /auth/me`, отдельный запрос не нужен). Для `LOCAL` — если подключён,
 * кнопки «Сменить пароль» (`ChangePasswordModal`, обновлён на новый
 * эндпоинт) и «Отключить»; если нет — кнопка «Подключить локальный вход»
 * (`AddLocalMethodModal`). Для `GOOGLE` — если подключён, кнопка
 * «Отключить»; если нет — сам виджет Google (`GoogleAuthService.connectButton()`,
 * тот же оверлей-приём, что в `LoginModal`/`RegisterModal`, но ведёт на
 * `POST /auth/methods/google`, не на вход). «Отключить» — через
 * `ConfirmModal`, кнопка скрыта, если это единственный оставшийся метод
 * (клиентская защита, дублирует backend `403` — не полагаемся только на
 * него). После любого подключения/отключения — `AuthService.fetchCurrentUser()`
 * (тот же приём, что после сохранения имени/аватара) — `authMethods`
 * обновляется реактивно, доп. состояния не заводилось.
 */
@Component({
  selector: 'app-profile-section',
  imports: [TextField, Button],
  templateUrl: './profile-section.html',
  styleUrl: './profile-section.scss',
})
export class ProfileSection {
  private readonly authService = inject(AuthService);
  private readonly authMethodsService = inject(AuthMethodsService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);

  private readonly savedName = signal(this.authService.currentUser()?.name ?? '');
  private readonly savedAvatarUrl = signal(this.authService.currentUser()?.avatarUrl ?? null);

  protected readonly name = signal(this.savedName());
  protected readonly pendingAvatarUrl = signal(this.savedAvatarUrl());
  protected readonly resolvedAvatarUrl = computed(() => {
    const url = this.pendingAvatarUrl();
    return url ? this.imageUrlService.resolve(url) : null;
  });

  protected readonly authMethodLabel = AUTH_METHOD_TYPE_LABELS;
  protected readonly authMethods = computed(
    () => this.authService.currentUser()?.authMethods ?? [],
  );
  protected readonly hasLocal = computed(() =>
    this.authMethods().some((method) => method.type === 'LOCAL'),
  );
  protected readonly hasGoogle = computed(() =>
    this.authMethods().some((method) => method.type === 'GOOGLE'),
  );
  // Клиентская защита от отключения последнего метода — дублирует backend
  // 403, чтобы не показывать кнопку, которая заведомо ответит ошибкой.
  protected readonly canDisconnect = computed(() => this.authMethods().length > 1);

  private readonly googleButtonOverlay =
    viewChild<ElementRef<HTMLDivElement>>('googleButtonOverlay');

  constructor() {
    effect((onCleanup) => {
      const el = this.googleButtonOverlay()?.nativeElement;
      if (!el) return;

      const subscription = this.googleAuthService.connectButton(el).subscribe({
        next: () => {
          this.refreshAuthMethods();
          this.notificationService.show('Google подключён', 'success');
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409) {
            this.notificationService.show(
              'Этот Google-аккаунт уже подключён к другому пользователю',
              'error',
            );
            return;
          }
          this.notificationService.show('Не удалось подключить Google, попробуйте снова', 'error');
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected onChangeAvatarClick(): void {
    this.modalService.open<AvatarPickerModalData>(AvatarPickerModal, {
      currentUrl: this.pendingAvatarUrl(),
      onConfirm: (url) => this.pendingAvatarUrl.set(url),
    });
  }

  protected onChangePasswordClick(): void {
    this.modalService.open(ChangePasswordModal);
  }

  protected onAddLocalClick(): void {
    this.modalService.open(AddLocalMethodModal, {
      onAdded: () => {
        this.refreshAuthMethods();
        this.notificationService.show('Локальный вход подключён', 'success');
      },
    });
  }

  protected onDisconnectClick(type: AuthMethodType): void {
    this.modalService.open<ConfirmModalData>(ConfirmModal, {
      message: `Отключить способ входа «${this.authMethodLabel[type]}»?`,
      confirmText: 'Отключить',
      onConfirm: () => {
        this.authMethodsService.disconnect(type).subscribe({
          next: () => {
            this.refreshAuthMethods();
            this.notificationService.show('Способ входа отключён', 'success');
          },
          error: (error: HttpErrorResponse) => {
            if (error.status === 403) {
              this.notificationService.show('Нельзя отключить единственный способ входа', 'error');
              return;
            }
            this.notificationService.show('Не удалось отключить способ входа', 'error');
          },
        });
      },
    });
  }

  private refreshAuthMethods(): void {
    this.authService.fetchCurrentUser().subscribe();
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
