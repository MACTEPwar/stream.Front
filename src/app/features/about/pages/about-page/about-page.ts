import { Component } from '@angular/core';

/** Заглушка — реальная страница «О себе» не входит в stream.Front#49, нужна только для ручной проверки роутинга/активного пункта nav. Фон — глобальный (см. src/styles/_reset.scss), собственного не задаёт. */
@Component({
  selector: 'app-about-page',
  template: `<h1>О себе (заглушка)</h1>`,
  styleUrl: './about-page.scss',
})
export class AboutPage {}
