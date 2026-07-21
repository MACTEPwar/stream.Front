import { Component } from '@angular/core';

/** Заглушка — реальная страница «Турниры» не входит в stream.Front#49, нужна только для ручной проверки роутинга/активного пункта nav. Фон — глобальный (см. src/styles/_reset.scss), собственного не задаёт. */
@Component({
  selector: 'app-tournaments-page',
  template: `<h1>Турниры (заглушка)</h1>`,
  styleUrl: './tournaments-page.scss',
})
export class TournamentsPage {}
