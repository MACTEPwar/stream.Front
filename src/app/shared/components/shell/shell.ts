import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {}
