/**
 * Одна новость в сетке/архиве страницы «Новости» (`docs/figma/news1.json`).
 * Источник — мок (`NewsService`), реального backend-эндпоинта под новости ещё
 * нет; поля — ровно те, что рисует вёрстка карточки/строки архива.
 */
export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  /** `null` — картинки нет, рисуется серый плейсхолдер (`picture`-прямоугольник макета, `rgb(217, 217, 217)`). */
  imageUrl: string | null;
  tagIds: string[];
  views: number;
  likes: number;
  publishedAt: Date;
}
