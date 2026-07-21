import { Component } from '@angular/core';

/** Заглушка — реальная страница «Видео» не входит в stream.Front#49, нужна только для ручной проверки роутинга/активного пункта nav. Фон — глобальный (см. src/styles/_reset.scss), собственного не задаёт. */
@Component({
  selector: 'app-video-page',
  template: `<h1>Видео (заглушка)</h1>`,
  styleUrl: './video-page.scss',
})
export class VideoPage {}
