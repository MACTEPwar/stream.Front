import { BreakpointObserver } from '@angular/cdk/layout';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { ImageUrlService } from '@core/services/image-url.service';
import { ModalService } from '@core/services/modal.service';
import { LoginModal } from '@features/auth/components/login-modal/login-modal';
import { SMALL_QUERY } from '@shared/utils/breakpoints';
import { DecorativeButton } from '../decorative-button/decorative-button';
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
 * Кнопка входа (`stream.Front#60`) открывает `LoginModal` через `ModalService`
 * (`ModalHost` подключён в `app.html`, рендерит активный компонент модалки).
 *
 * Точка входа в «Личный кабинет» (`stream.Front#64`): реактивно подписан на
 * `AuthService.isAuthenticated()`/`currentUser()` — гость видит кнопку
 * «Войти», залогиненный вместо неё видит аватар+имя (ссылка на `/account`).
 * Мигания при hard refresh нет — `initializeAuth` (`stream.Front#14`,
 * `provideAppInitializer`) блокирует первый рендер роутов/этого компонента
 * до завершения `fetchCurrentUser()`, так что `isAuthenticated()` уже
 * определено к моменту первой отрисовки шаблона.
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
 *
 * **Компактное меню** (`ШАП-Ф-02`—`ШАП-Ф-14`, `specs/01-common/spec.md`,
 * `stream.Front#144`) — порог тот же, что у всей страницы (`isCompact`,
 * `BreakpointObserver`/`SMALL_QUERY`, `ШАП-Ф-06`), своего числа шапка не
 * заводит. `shellActions` (`<ng-template>`) — общая разметка навигации/
 * кнопки поддержки/области входа, инстанцируется РОВНО В ОДНОМ месте за
 * раз через `NgTemplateOutlet`: в строке шапки при `!isCompact()`, либо в
 * открытой панели при `isCompact() && isMenuOpen()` — никогда одновременно,
 * иначе `navLinkTextEls()` находил бы по два элемента на каждый пункт меню
 * и `ResizeObserver`-эффект выше начал бы мерить не тот `<span>`. Внутри
 * шаблона `[width]` у кнопок (`DecorativeButton`) переключается
 * `'content'`/`'parent'` тем же `isCompact()` — `'parent'` растягивает
 * кнопку на всю ширину панели (`ШАП-Ф-03`), в строке шапки остаётся
 * прежний auto-width под содержимое.
 *
 * Панель (`.shell__menu-panel`) вложена внутрь `.shell__header`
 * (`position: relative` там уже есть) и стоит `position: absolute;
 * top: 100%` — оказывается точно под строкой шапки без измерения её
 * высоты в JS (`ШАП-Ф-13`). Рендерится через `@if (isMenuOpen())`, не
 * CSS-скрытием — каждое открытие пересоздаёт `cdkTrapFocus` с нуля, и это
 * даёт бесплатно то, что иначе пришлось бы писать руками (`ШАП-Ф-09`):
 * `cdkTrapFocusAutoCapture` переносит фокус на первый пункт панели при
 * монтировании, а при размонтировании (закрытие любым способом — клик по
 * пункту/фону, Esc, повторный клик по переключателю, авто-закрытие при
 * выходе из компактной раскладки) сам возвращает фокус на элемент,
 * бывший активным непосредственно перед открытием — это и есть
 * переключатель, поскольку клик по кнопке фокусирует её раньше, чем
 * успевает отработать `(click)`-обработчик. Отдельного кода возврата
 * фокуса не требуется. Дальше границ панели `Tab` в любом случае не
 * уйдёт — trap перехватывает его на собственных якорях раньше, чем
 * фокус добрался бы до `.shell__content` — тем не менее `.shell__content`
 * дополнительно получает `inert`, пока меню открыто (`ШАП-Ф-10`): убирает
 * содержимое страницы из-под указателя (у `inert` этого свойства у
 * фокус-ловушки нет) и из табуляции одним нативным атрибутом.
 *
 * `.shell__menu-backdrop` — `position: fixed; inset: 0`, отдельный сиблинг
 * `.shell__header`/`.shell__content` внутри `.shell`, ниже шапки по
 * `z-index` (сама шапка остаётся на виду и некликабельно-читаемой,
 * `ШАП-Ф-02`, `ШАП-Ф-14`).
 *
 * Пока меню открыто, прокрутка страницы заблокирована на `document.body`
 * (реальный скролл идёт на уровне document, не `.shell__content` — см.
 * комментарий в shell.scss) — `ШАП-Ф-12`; сама панель при нехватке высоты
 * скроллится сама (`overflow-y: auto` в shell.scss).
 *
 * Выход из компактной раскладки с открытым меню закрывает его без
 * сохранения состояния (`ШАП-Ф-11`) — у открытого меню нет аналога в
 * некомпактной раскладке, сохранять нечего.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    NavActiveIndicator,
    DecorativeButton,
    NgTemplateOutlet,
    CdkTrapFocus,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly modalService = inject(ModalService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  protected readonly authService = inject(AuthService);

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

  protected readonly isCompact = toSignal(
    this.breakpointObserver.observe(SMALL_QUERY).pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly isMenuOpen = signal(false);

  protected onNavLinkActiveChange(index: number, isActive: boolean): void {
    if (isActive) this.activeIndex.set(index);
  }

  protected onLoginClick(): void {
    this.modalService.open(LoginModal);
  }

  protected resolveAvatarUrl(path: string): string {
    return this.imageUrlService.resolve(path);
  }

  protected onMenuToggleClick(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected onMenuBackdropClick(): void {
    this.closeMenu();
  }

  /** Клик по любому пункту меню — включая текущий раздел — закрывает меню (`ШАП-Ф-05`). */
  protected onMenuItemClick(): void {
    this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }

  private closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  constructor() {
    effect((onCleanup) => {
      const el = this.navLinkTextEls()[this.activeIndex()]?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.navIndicatorWidth.set(entry.contentRect.width),
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });

    // ШАП-Ф-11 — выход из компактной раскладки закрывает открытое меню.
    effect(() => {
      if (!this.isCompact()) {
        this.isMenuOpen.set(false);
      }
    });

    // ШАП-Ф-12 — пока меню открыто, страница (document-level скролл, см.
    // shell.scss) не прокручивается.
    effect((onCleanup) => {
      if (!this.isMenuOpen()) return;
      document.body.style.overflow = 'hidden';
      onCleanup(() => {
        document.body.style.overflow = '';
      });
    });
  }
}
