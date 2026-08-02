import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { NewsItem } from '../models/news.model';

/** Тексты — Lorem ipsum ровно из макета (`docs/figma/news1.json`, `heading`/`text`). */
const LONG_TITLE = 'Lorem ipsum dolor sit amet consectetur.';
const SHORT_TITLE = 'Заголовок';
const LONG_EXCERPT =
  'Lorem ipsum dolor sit amet consectetur. Id nunc feugiat ac imperdiet sed eget. Id vitae erat aenean mattis non ultrices tincidunt ultricies. Varius diam eget a massa feugiat. Leo nunc feugiat sed non at a imperdiet. Nunc nulla morbi ac nunc imperdiet.';
const MEDIUM_EXCERPT = 'Lorem ipsum dolor sit amet consectetur. Id nunc feugiat ac imperdiet sed eget.';
const SHORT_EXCERPT = 'Lorem ipsum dolor sit amet consectetur. Enim ultricies varius iaculis.';

/**
 * Тестовые картинки, уже лежащие в `public/images/` (те же, что использует
 * `MainCarousel`, stream.Front#28) — отдельных бинарников под новости не
 * заводилось; часть записей намеренно с `imageUrl: null`, чтобы был виден и
 * плейсхолдер-прямоугольник макета.
 */
const TEST_IMAGE_0 = '/images/main-carousel/slide-0-test.png';
const TEST_IMAGE_1 = '/images/main-carousel/slide-1-test.png';

const MOCK_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: LONG_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: TEST_IMAGE_0,
    imageUrls: [TEST_IMAGE_0],
    tagIds: ['tournament', 'mlbb'],
    views: 980,
    likes: 1400,
    publishedAt: new Date(2023, 11, 6),
    viewedByCurrentUser: true,
    likedByCurrentUser: false,
  },
  {
    id: 'news-2',
    title: SHORT_TITLE,
    excerpt: MEDIUM_EXCERPT,
    imageUrl: TEST_IMAGE_1,
    imageUrls: [TEST_IMAGE_1],
    tagIds: ['announcement'],
    views: 743,
    likes: 210,
    publishedAt: new Date(2023, 11, 4),
    viewedByCurrentUser: false,
    likedByCurrentUser: false,
  },
  {
    id: 'news-3',
    title: SHORT_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: null,
    imageUrls: [],
    tagIds: ['stream', 'pc-games'],
    views: 2400,
    likes: 890,
    publishedAt: new Date(2023, 10, 28),
    viewedByCurrentUser: true,
    likedByCurrentUser: true,
  },
  {
    id: 'news-4',
    title: LONG_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: TEST_IMAGE_1,
    imageUrls: [TEST_IMAGE_1],
    tagIds: ['rsikk'],
    views: 312,
    likes: 96,
    publishedAt: new Date(2023, 10, 21),
    viewedByCurrentUser: false,
    likedByCurrentUser: true,
  },
  {
    id: 'news-5',
    title: SHORT_TITLE,
    excerpt: SHORT_EXCERPT,
    imageUrl: null,
    imageUrls: [],
    tagIds: ['esports', 'mobile-games'],
    views: 1120,
    likes: 1500,
    publishedAt: new Date(2023, 10, 15),
    viewedByCurrentUser: true,
    likedByCurrentUser: false,
  },
  {
    id: 'news-6',
    title: SHORT_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: TEST_IMAGE_0,
    imageUrls: [TEST_IMAGE_0],
    tagIds: ['tournament', 'esports'],
    views: 640,
    likes: 175,
    publishedAt: new Date(2023, 10, 9),
    viewedByCurrentUser: false,
    likedByCurrentUser: false,
  },
  {
    id: 'news-7',
    title: LONG_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: TEST_IMAGE_1,
    imageUrls: [TEST_IMAGE_1],
    tagIds: ['mlbb'],
    views: 5300,
    likes: 2100,
    publishedAt: new Date(2023, 10, 2),
    viewedByCurrentUser: true,
    likedByCurrentUser: true,
  },
];

/**
 * Мок-источник новостей закреплённой сетки страницы «Новости» — тот же
 * паттерн, что у `NewsTagService` (реального справочника новостей под
 * `PinnedNewsGrid` ещё нет, id ссылаются на моки, а не на реальные записи
 * бэкенда). Раскладка сетки (`PinnedGridLayout`/`PinnedNewsSlot`) больше не
 * мок — `stream.Front#119` перевёл её на реальный backend
 * (`streamer.API#71`), см. `PinnedGridService`.
 */
@Injectable({ providedIn: 'root' })
export class NewsService {
  getNews(): Observable<NewsItem[]> {
    return of(MOCK_NEWS);
  }
}
