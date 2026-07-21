import { Component } from '@angular/core';

/** Заглушка — реальная страница «Новости» не входит в stream.Front#49, нужна только для ручной проверки роутинга/активного пункта nav. Фон — глобальный (см. src/styles/_reset.scss), собственного не задаёт. */
@Component({
  selector: 'app-news-page',
  template: `<h1>Новости (заглушка)</h1>`,
  styleUrl: './news-page.scss',
})
export class NewsPage {}
