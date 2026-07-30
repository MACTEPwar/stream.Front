import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { NewsTag } from '../models/news-tag.model';

const MOCK_TAGS: NewsTag[] = [
  { id: 'tournament', name: 'Турнир', severity: 'danger' },
  { id: 'mlbb', name: 'MLBB', color: '#e6772e' },
  { id: 'announcement', name: 'Анонс', color: '#d4b106' },
  { id: 'stream', name: 'Стрим', severity: 'success' },
  { id: 'rsikk', name: 'РСИКК', severity: 'info' },
  { id: 'pc-games', name: 'ПК-игры', severity: 'secondary' },
  { id: 'mobile-games', name: 'Мобильные игры', color: '#8e44ad' },
  { id: 'esports', name: 'Киберспорт', severity: 'primary' },
];

/** Мок-источник тегов новостей (`NewsFilterPanel`, stream.Front#111) — реального backend-эндпоинта под теги новостей ещё нет. */
@Injectable({ providedIn: 'root' })
export class NewsTagService {
  getTags(): Observable<NewsTag[]> {
    return of(MOCK_TAGS);
  }
}
