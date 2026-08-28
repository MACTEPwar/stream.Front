import { ImageVariant } from '@features/admin/models/news.model';
import { selectImageVariant } from './select-image-variant';

const ORIGINAL = '/uploads/original.jpg';

const VARIANTS: ImageVariant[] = [
  { width: 175, url: '/uploads/original-175w.jpg' },
  { width: 330, url: '/uploads/original-330w.jpg' },
  { width: 680, url: '/uploads/original-680w.jpg' },
  { width: 1030, url: '/uploads/original-1030w.jpg' },
];

describe('selectImageVariant', () => {
  it('выбирает ближайший вариант, чья ширина не меньше нужной', () => {
    expect(selectImageVariant(ORIGINAL, VARIANTS, 300, 1)).toBe('/uploads/original-330w.jpg');
  });

  it('точное совпадение ширины — берёт его', () => {
    expect(selectImageVariant(ORIGINAL, VARIANTS, 330, 1)).toBe('/uploads/original-330w.jpg');
  });

  it('учитывает devicePixelRatio — на retina нужна вдвое большая ширина', () => {
    // 175 × 2 = 350 нужных точек — ближайший вариант не меньше этого числа
    // (330 < 350, ему не хватает), берётся 680.
    expect(selectImageVariant(ORIGINAL, VARIANTS, 175, 2)).toBe('/uploads/original-680w.jpg');
  });

  it('нет варианта шире нужного — используется оригинал', () => {
    expect(selectImageVariant(ORIGINAL, VARIANTS, 2000, 1)).toBe(ORIGINAL);
  });

  it('пустой список вариантов — используется оригинал', () => {
    expect(selectImageVariant(ORIGINAL, [], 175, 1)).toBe(ORIGINAL);
  });

  it('минимальная нужная ширина (0) — берёт самый маленький вариант', () => {
    expect(selectImageVariant(ORIGINAL, VARIANTS, 0, 1)).toBe('/uploads/original-175w.jpg');
  });
});
