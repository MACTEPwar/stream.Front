import { ImageVariant } from '@features/admin/models/news.model';

/**
 * Выбирает размерный вариант изображения под конкретное место показа
 * (`stream.Front#130`, `АДП-Ф-23`) — ближайший вариант, чья ширина не меньше
 * нужной с учётом плотности экрана (`devicePixelRatio`), а не угадывание по
 * имени файла или размеру окна. Если такого варианта нет (редкий случай —
 * все варианты теснее нужного, например очень широкое место на очень
 * плотном экране), используется оригинал: он не уже любого своего варианта.
 *
 * Принимает уже готовые `url` — сама ничего не резолвит (`ImageUrlService`
 * не знает здесь), вызывающая сторона решает, когда резолвить: `NewsCard`
 * работает с уже резолвленными `NewsItem.cover.variants`
 * (`NewsItemAdapterService`), `NewsArchiveItem`/`NewsDetailModal` резолвят
 * только выбранный `url`, не весь список.
 */
export function selectImageVariant(
  originalUrl: string,
  variants: readonly ImageVariant[],
  targetWidthPx: number,
  devicePixelRatio: number,
): string {
  const neededWidthPx = Math.ceil(targetWidthPx * devicePixelRatio);
  const candidate = variants
    .filter((variant) => variant.width >= neededWidthPx)
    .sort((a, b) => a.width - b.width)[0];
  return candidate?.url ?? originalUrl;
}
