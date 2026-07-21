import { Component } from '@angular/core';

// Каждый инстанс получает свой -uid суффикс на оба url(#...) в шаблоне —
// без этого несколько <app-nav-active-indicator> на одной странице делили
// бы один и тот же id, а url(#id) резолвился бы в первый попавшийся элемент
// в документе, не в свой собственный <svg> (тот же баг, что был у Button/
// SectionTitle, см. frontend/src/app/shared/components/button/button.ts).
let nextNavActiveIndicatorUid = 0;

/**
 * Декоративная подложка активного пункта меню (stream.Front#49) — перенос
 * приложенного пользователем SVG (91×10): две затухающие горизонтальные
 * линии по краям, сходящиеся к паре стрелочек-шевронов в центре. 1:1 код из
 * файла, полностью статичный — ни ширина, ни цвет не параметризуются (в
 * отличие от Button/SectionTitle, здесь нет known сценария под растягивание
 * или несколько цветовых вариантов).
 */
@Component({
  selector: 'app-nav-active-indicator',
  imports: [],
  templateUrl: './nav-active-indicator.html',
  styleUrl: './nav-active-indicator.scss',
})
export class NavActiveIndicator {
  protected readonly uid = `navactiveindicator${nextNavActiveIndicatorUid++}`;
}
