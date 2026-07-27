import { Injectable } from '@angular/core';

import { environment } from '@env/environment';

const UPLOADS_URL_PREFIX = '/uploads/';

/**
 * Резолвит только backend-загруженные пути (`/uploads/*`, `stream.Front#65`
 * upload-флоу) — они валидны исключительно относительно origin backend, не
 * фронта. Пресеты (`/images/avatar-presets/*`, лежат в `public/` самого
 * фронта) и уже абсолютные `http(s)://`-урлы возвращаются как есть — иначе
 * их некорректно склеило бы с `environment.apiUrl` (баг `stream.Front#84`:
 * этот метод существовал с самого начала, но нигде не вызывался — Shell/
 * ProfileSection/AvatarPickerModal рендерили `avatarUrl` напрямую).
 */
@Injectable({ providedIn: 'root' })
export class ImageUrlService {
  resolve(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith(UPLOADS_URL_PREFIX)) {
      return `${environment.apiUrl}${path}`;
    }
    return path;
  }
}
