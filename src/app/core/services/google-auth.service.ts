import { Injectable, inject } from '@angular/core';
import { Observable, Subject, from, switchMap, take } from 'rxjs';

import { environment } from '@env/environment';
import { CurrentUser } from '../models/current-user.model';
import { AuthMethodsService } from './auth-methods.service';
import { AuthService } from './auth.service';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  width?: number;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(parent: HTMLElement, config: GoogleButtonConfig): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DEFAULT_BUTTON_WIDTH = 240;

/**
 * `prompt()`/One Tap (см. историю до `stream.Front#72`) требует FedCM API
 * и падает с 403 на внутреннем статус-чеке SDK везде, где заблокированы
 * сторонние cookie (Firefox и т.п.) — это архитектурное ограничение самого
 * API, не баг конфигурации (`use_fedcm_for_prompt` его не чинит нигде,
 * кроме Chromium). `renderButton()` — надёжная замена во всех браузерах:
 * официальная Google-кнопка рендерится iframe'ом с доменом
 * accounts.google.com, поэтому клик по ней — прямое взаимодействие с
 * доменом Google, а не сторонний контекст.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly authService = inject(AuthService);
  private readonly authMethodsService = inject(AuthMethodsService);

  private scriptLoadPromise: Promise<void> | null = null;
  private initialized = false;
  private readonly credentialSubject = new Subject<string>();

  /**
   * Рендерит невидимую официальную Google-кнопку внутрь `container` (в UI
   * она накладывается прозрачным оверлеем поверх нашей стилизованной
   * `app-decorative-button` — см. `LoginModal`/`RegisterModal`) и логинит через
   * `POST /auth/google`. См. `getIdToken()` — общая механика с
   * `connectButton()` (`stream.Front#82`), только конечное действие разное
   * (вход vs подключение метода к уже залогиненному аккаунту).
   */
  renderButton(container: HTMLElement): Observable<CurrentUser> {
    return this.getIdToken(container).pipe(
      switchMap((idToken) => this.authService.loginWithGoogle(idToken)),
    );
  }

  /**
   * Тот же виджет, что `renderButton()`, но вместо входа подключает Google
   * к уже залогиненному текущему пользователю (`POST /auth/methods/google`,
   * `stream.Front#82`) — используется в `ProfileSection`, блок «Способы
   * входа».
   */
  connectButton(container: HTMLElement): Observable<{ success: true }> {
    return this.getIdToken(container).pipe(
      switchMap((idToken) => this.authMethodsService.connectGoogle(idToken)),
    );
  }

  /**
   * Общая механика обоих виджетов: грузит SDK, рендерит Google-кнопку в
   * `container`, возвращает Observable, эмитящий ID-токен ровно один раз при
   * следующем успешном входе через ЛЮБОЙ отрендеренный этим сервисом
   * Google-виджет (колбэк `initialize()` регистрируется глобально один раз,
   * `take(1)` не даёт одной подписке подхватить чужой/старый эмит). Если
   * пользователь просто закрыл попап Google — колбэк не вызывается,
   * Observable не эмитит ничего (не ошибка) — это ожидаемое поведение
   * `renderButton()` самого SDK, GIS не даёт явного сигнала отмены.
   */
  private getIdToken(container: HTMLElement): Observable<string> {
    return from(this.loadScript()).pipe(
      switchMap(() => {
        if (!window.google) {
          throw new Error('Google Identity Services SDK недоступен');
        }

        this.ensureInitialized(window.google.accounts.id);
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: container.offsetWidth || DEFAULT_BUTTON_WIDTH,
        });
        return this.credentialSubject.pipe(take(1));
      }),
    );
  }

  private ensureInitialized(accountsId: GoogleAccountsId): void {
    if (this.initialized) return;

    accountsId.initialize({
      client_id: environment.googleClientId,
      callback: (response) => this.credentialSubject.next(response.credential),
    });
    this.initialized = true;
  }

  private loadScript(): Promise<void> {
    if (!this.scriptLoadPromise) {
      this.scriptLoadPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = GSI_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error('Не удалось загрузить Google Identity Services SDK'));
        document.head.appendChild(script);
      });
    }
    return this.scriptLoadPromise;
  }
}
