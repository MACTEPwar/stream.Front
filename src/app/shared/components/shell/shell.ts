import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NavActiveIndicator } from '../nav-active-indicator/nav-active-indicator';

/**
 * Header/nav по мокапу `main-nav` (docs/figma/main1.json, main2.json и др.).
 * Реальное содержимое компонента (лого, пункты меню, кнопка входа/аватар)
 * не выгружено из Figma API — упёрлись в rate limit (см. figma.md).
 * Пункты меню ниже — по факту известных разделов сайта (главная/новости/
 * турниры, судя по составу docs/figma/*.json), требуют подтверждения,
 * когда лимит Figma API снимется и main-nav получится прочитать целиком.
 *
 * Кнопка входа — статичный гостевой вид, без привязки к AuthService
 * (`stream.Front#4`) — привязка отложена в отдельную follow-up задачу.
 *
 * `NavActiveIndicator` (`stream.Front#49`) — декоративная подложка под
 * текстом активного пункта меню. Фиксированно под первым пунктом
 * («Главная») — привязка к текущему роуту сознательно не входит в эту
 * задачу (см. issue), это follow-up.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, NavActiveIndicator],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {}
