import { Component, ElementRef, effect, signal, viewChildren } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Button } from '../button/button';
import { NavActiveIndicator } from '../nav-active-indicator/nav-active-indicator';

/** Совпадает с дефолтом `NavActiveIndicator.width()` — до первого измерения ResizeObserver'ом (или в jsdom-тестах). */
const DEFAULT_NAV_INDICATOR_WIDTH = 91;

interface NavItem {
  readonly path: string;
  readonly label: string;
  /** `routerLinkActiveOptions.exact` — только `/main` должен матчиться точно, иначе он "активен" на любом вложенном роуте. */
  readonly exact: boolean;
}

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
 * текстом активного пункта меню, привязана к реальному роуту через
 * `routerLinkActive`/`(isActiveChange)` (изначально в этой задаче было
 * зафиксировано под первым пунктом, но по прямому запросу пользователя
 * переведено на реальный активный роут). Ширина подложки — фактическая
 * ширина отрендеренного текста ТЕКУЩЕГО активного пункта, измеряется
 * `ResizeObserver`'ом на соответствующем `<span>` (тот же приём, что и у
 * `SectionTitle`) — реагирует на смену шрифта/контента без хардкода
 * пикселей. ResizeObserver недоступен в jsdom (юнит-тесты) — там ширина
 * остаётся на `DEFAULT_NAV_INDICATOR_WIDTH`, совпадающем с дефолтом
 * `NavActiveIndicator.width()`.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, NavActiveIndicator, Button],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly navItems: readonly NavItem[] = [
    { path: '/main', label: 'Главная', exact: true },
    { path: '/news', label: 'Новости', exact: false },
    { path: '/tournaments', label: 'Турниры', exact: false },
    { path: '/video', label: 'Видео', exact: false },
    { path: '/about', label: 'О себе', exact: false },
  ];

  private readonly navLinkTextEls = viewChildren<ElementRef<HTMLSpanElement>>('navLinkText');
  protected readonly activeIndex = signal(0);
  protected readonly navIndicatorWidth = signal(DEFAULT_NAV_INDICATOR_WIDTH);

  protected onNavLinkActiveChange(index: number, isActive: boolean): void {
    if (isActive) this.activeIndex.set(index);
  }

  constructor() {
    effect((onCleanup) => {
      const el = this.navLinkTextEls()[this.activeIndex()]?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => this.navIndicatorWidth.set(entry.contentRect.width));
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }
}
