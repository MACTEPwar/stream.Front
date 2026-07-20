export interface SocialLink {
  /** Путь до иконки соцсети — статичный ассет `public/icons/*.svg`. */
  icon: string;
  /** Отображаемый хэндл (не сам URL). */
  handle: string;
  /** Ссылка на профиль. */
  url: string;
}

/**
 * Список соцсетей блока `SocialLinksBlock` (stream.Front#32) — статичный
 * конфиг на фронте, не backend (решено в самой задаче: хэндлы владельца
 * канала меняются крайне редко). URL — плейсхолдеры до реальных ссылок
 * (тот же приём, что у `environment.googleClientId`).
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    icon: '/icons/social-link-46.svg',
    handle: '@belkasmailykova',
    url: 'REPLACE_WITH_SOCIAL_LINK_1_URL',
  },
  {
    icon: '/icons/social-link-47.svg',
    handle: '@BelkaSmailyk',
    url: 'REPLACE_WITH_SOCIAL_LINK_2_URL',
  },
  {
    icon: '/icons/social-link-45.svg',
    handle: '@BelkaSmailykova',
    url: 'REPLACE_WITH_SOCIAL_LINK_3_URL',
  },
];
