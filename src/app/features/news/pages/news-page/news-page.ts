import { Component } from '@angular/core';

import { NewsFilterSidebar } from '../../components/news-filter-sidebar/news-filter-sidebar';

/**
 * Реальная страница «Новости» ещё не реализована (список новостей не
 * существует, stream.Front#49 не входила) — сейчас только триггер+сайдбар
 * фильтра (`NewsFilterSidebar`, stream.Front#111).
 */
@Component({
  selector: 'app-news-page',
  imports: [NewsFilterSidebar],
  template: `<app-news-filter-sidebar />`,
  styleUrl: './news-page.scss',
})
export class NewsPage {}
