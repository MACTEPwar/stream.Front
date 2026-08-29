import { BreakpointObserver } from '@angular/cdk/layout';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
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
 * **Компактный вид** (`ШАП-Ф-02`—`ШАП-Ф-06`, `ШАП-Ф-08`—`ШАП-Ф-14`,
 * `specs/01-common/spec.md`, `stream.Front#144`) — порог тот же, что у всей
 * страницы (`isCompact`, `BreakpointObserver`/`SMALL_QUERY`, `ШАП-Ф-06`),
 * своего числа шапка не заводит.
 *
 * **Средний вид** (`ШАП-Ф-15`—`ШАП-Ф-18`, `stream.Front#146`) — НЕ порог
 * ширины экрана: шапка сама измеряет, помещается ли реальный широкий состав
 * строки (лого исключён — он всегда слева и в измерении не участвует).
 * Два `ResizeObserver`-измерения (тот же приём, что уже применяет
 * `NavActiveIndicator` для ширины текста):
 * 1. `measuredActionsWidthPx` — сколько места РЕАЛЬНО доступно справа от
 *    бренд-блока (`.shell__header-actions`, `flex: 1 1 0%` — сам факт того,
 *    что это flex-item с `flex-basis: 0%`, даёт браузеру честно посчитать
 *    "оставшееся" место, не завязываясь на то, что внутри сейчас отрисовано:
 *    пусто (компактный вид), компактная область входа+кнопка (средний) или
 *    вся строка (широкий) — контейнер всегда один и тот же по смыслу).
 * 2. `measuredWideRowWidthPx` — сколько места ЗАНЯЛ БЫ полный широкий состав
 *    (5 пунктов меню + кнопка поддержки + [ссылка «Панель управления»] +
 *    область входа), если бы его не сжимали. Меряется на `.shell__row-probe`
 *    — невидимом (`visibility: hidden`, `inert`), но ВСЕГДА отрисованном
 *    слепке той же строки: `position: absolute` без `right` снимает с него
 *    ограничение доступной ширины (shrink-to-fit/`fit-content`), поэтому
 *    его собственная ширина — это ИМЕННО потребность контента, а не то,
 *    сколько ему досталось места. Слепок использует ОТДЕЛЬНЫЕ CSS-классы
 *    (`.shell__row-probe-*`, не `.shell__nav`/`.shell__nav-link`/
 *    `.shell__support-button`/…) — совпадение классов с видимым содержимым
 *    заставило бы `querySelector`-проверки (юнит-тесты, потенциально и
 *    будущий код) находить и даже кликать невидимый/`inert` слепок вместо
 *    настоящего элемента. Геометрию (шрифт через `mixins.mainNav`, отступы
 *    через те же SCSS-переменные) слепок при этом делит с настоящей
 *    разметкой НЕ через общий класс, а через общие миксины/переменные —
 *    ширина не может разъехаться незаметно при правке типографики. Если
 *    состав самой широкой строки (`shellActions`) когда-нибудь изменится
 *    (новый пункт, доп. бейдж) — слепок (`wideRowProbe`) нужно поправить
 *    вручную следом, это НЕ автоматическая синхронизация.
 *
 * `isMedium` — `computed()`: `measuredWideRowWidthPx() > measuredActionsWidthPx()`.
 * Оба сигнала стартуют с `0` — до первого измерения (или в jsdom, где
 * `ResizeObserver` недоступен) `isMedium()` даёт `false`, т.е. поведение
 * без RO ничем не отличается от того, что было до `stream.Front#146`
 * (широкий вид) — юнит-тесты остаются валидны без изменений, а тесты САМОГО
 * среднего вида приводят `measuredActionsWidthPx`/`measuredWideRowWidthPx` в
 * нужное соотношение напрямую (тот же приём, что уже используется для
 * `currentUserSignal` в тестах — сигналы читаются через каст, RO в jsdom не
 * нужен). Измерение работает ВСЕГДА, независимо от текущего вида (`isCompact`/
 * `isMedium`/широкий) — это и даёт «живой», двусторонний переход (`ШАП-Ф-15`):
 * `.shell__header-actions`/`.shell__row-probe` не убираются из DOM ни при
 * каком состоянии, только их видимое содержимое переключается.
 *
 * **Приоритет видов.** `isCompact()` побеждает всегда (`ШАП-Ф-07`): при
 * компактной раскладке страницы шапка получает полный компактный вид,
 * даже если `isMedium()` тоже true (измерение при узком `.shell__header`
 * почти наверняка покажет «не помещается» — это неважно, шаблон проверяет
 * `isCompact()` раньше `isMedium()` везде). Порядок: `isCompact()` → полный
 * компактный вид; иначе `isMedium()` → средний вид; иначе — широкий.
 *
 * **Разметка строки шапки** — `.shell__brand` (лого, разделитель,
 * переключатель `.shell__menu-toggle` — теперь ОДНО место в разметке для
 * обоих видов-с-гамбургером, а не два разных, как было бы при сохранении
 * прежнего "переключатель прижат вправо" в компактном виде: `ШАП-Ф-16`
 * прямо требует лого+переключатель слева в среднем виде, и для единообразия
 * тот же переключатель теперь везде слева, а не только в среднем) и
 * `.shell__header-actions` (всё остальное — измеряемая область, `flex: 1`).
 * Панель (`.shell__menu-panel`) — по-прежнему ребёнок `.shell__header`
 * (`position: absolute; top: 100%`), рендерится при
 * `(isCompact() || isMedium()) && isMenuOpen()`; её СОДЕРЖИМОЕ отличается —
 * `isCompact()` даёт полный `shellActions` (нав + кнопка поддержки + область
 * входа + [админ-ссылка], `ШАП-О-03`), иначе (средний) — только нав и
 * админ-ссылка (`ШАП-Ф-17`, кнопка поддержки/область входа уже видны в
 * строке, `ШАП-Ф-16`). Список навигации (`#navListItems`) и админ-ссылка
 * (`#adminLinkItem`) — общие `<ng-template>`, переиспользуются `shellActions`
 * и средней панелью; поскольку строка и панель никогда не показывают нав
 * одновременно (см. правило приоритета выше и то, что панель вообще
 * рендерится только когда строка нав не показывает), `#navLinkText`
 * инстанцируется по-прежнему ровно один раз одновременно — тот же инвариант,
 * что был важен уже в `stream.Front#144`.
 *
 * Пока меню открыто (`isCompact() || isMedium()`), прокрутка страницы
 * заблокирована на `document.body` — `ШАП-Ф-12`/`ШАП-Ф-18`; выход из ОБОИХ
 * видов сразу (не только компактного, `ШАП-Ф-11`, но теперь и среднего —
 * входит в общий список `ШАП-Ф-09`—`ШАП-Ф-12`, на который явно ссылается
 * `ШАП-Ф-18`) закрывает открытое меню без сохранения состояния.
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

  private readonly headerActionsEl = viewChild<ElementRef<HTMLDivElement>>('headerActionsEl');
  private readonly rowProbeEl = viewChild<ElementRef<HTMLDivElement>>('rowProbeEl');
  protected readonly measuredActionsWidthPx = signal(0);
  protected readonly measuredWideRowWidthPx = signal(0);
  /** `ШАП-Ф-15` — измерение, не порог ширины экрана; см. JSDoc класса. */
  protected readonly isMedium = computed(
    () => this.measuredWideRowWidthPx() > this.measuredActionsWidthPx(),
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

    // ШАП-Ф-15 — доступное место справа от бренд-блока (`.shell__header-actions`,
    // flex: 1 1 0%). Измеряется всегда, независимо от текущего вида — см. JSDoc.
    effect((onCleanup) => {
      const el = this.headerActionsEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.measuredActionsWidthPx.set(entry.contentRect.width),
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });

    // ШАП-Ф-15 — сколько места занял бы полный широкий состав строки, если
    // бы его не сжимали (`.shell__row-probe`, position: absolute без right —
    // shrink-to-fit, не зависит от доступного места). Измеряется всегда.
    effect((onCleanup) => {
      const el = this.rowProbeEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.measuredWideRowWidthPx.set(entry.contentRect.width),
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });

    // ШАП-Ф-11/ШАП-Ф-18 — выход из ОБОИХ видов-с-гамбургером (компактного И
    // среднего) закрывает открытое меню.
    effect(() => {
      if (!this.isCompact() && !this.isMedium()) {
        this.isMenuOpen.set(false);
      }
    });

    // ШАП-Ф-12/ШАП-Ф-18 — пока меню открыто, страница (document-level скролл,
    // см. shell.scss) не прокручивается.
    effect((onCleanup) => {
      if (!this.isMenuOpen()) return;
      document.body.style.overflow = 'hidden';
      onCleanup(() => {
        document.body.style.overflow = '';
      });
    });
  }
}
