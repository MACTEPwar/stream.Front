import { Component } from '@angular/core';
import { PopoverModule } from 'primeng/popover';

import { Button } from '@shared/components/button/button';

import { NewsFilterPanel } from '../../components/news-filter-panel/news-filter-panel';

/**
 * Реальная страница «Новости» ещё не реализована (stream.Front#49 не входила)
 * — сейчас демо `NewsFilterPanel` (stream.Front#111): кнопка-воронка
 * (`app-button`, icon-only, `severity="contrast"`) открывает `NewsFilterPanel`
 * в `p-popover` (PrimeNG 22), без применения к списку новостей (списка не
 * существует). Фон — глобальный (см. src/styles/_reset.scss), собственного не
 * задаёт.
 */
@Component({
  selector: 'app-news-page',
  imports: [Button, NewsFilterPanel, PopoverModule],
  template: `
    <app-button icon="pi pi-filter" severity="contrast" (click)="op.toggle($event)" />
    <p-popover #op styleClass="news-page__filter-popover">
      <app-news-filter-panel />
    </p-popover>
  `,
  styleUrl: './news-page.scss',
})
export class NewsPage {}
