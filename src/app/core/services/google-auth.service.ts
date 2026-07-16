import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';

import { environment } from '@env/environment';
import { CurrentUser } from '../models/current-user.model';
import { AuthService } from './auth.service';

interface GoogleCredentialResponse {
  credential: string;
}

interface GooglePromptMomentNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  prompt(momentListener?: (notification: GooglePromptMomentNotification) => void): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly authService = inject(AuthService);

  private scriptLoadPromise: Promise<void> | null = null;

  signIn(): Observable<CurrentUser> {
    return from(this.loadScript()).pipe(
      switchMap(() => this.requestIdToken()),
      switchMap((idToken) => this.authService.loginWithGoogle(idToken)),
    );
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

  private requestIdToken(): Observable<string> {
    return new Observable<string>((subscriber) => {
      if (!window.google) {
        subscriber.error(new Error('Google Identity Services SDK недоступен'));
        return;
      }

      window.google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response) => {
          subscriber.next(response.credential);
          subscriber.complete();
        },
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          subscriber.error(new Error('Вход через Google отменён или попап закрыт'));
        }
      });
    });
  }
}
