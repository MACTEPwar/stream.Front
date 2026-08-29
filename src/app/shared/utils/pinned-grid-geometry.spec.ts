import { computePinnedGridAreaSize, resolvePinnedGridViewport } from './pinned-grid-geometry';

describe('resolvePinnedGridViewport', () => {
  it('берёт large для альбомной ориентации от планшетных порогов', () => {
    expect(resolvePinnedGridViewport(1024, 768)).toBe('large');
    expect(resolvePinnedGridViewport(1920, 1080)).toBe('large');
  });

  it('берёт large для любой ширины от десктопного порога, независимо от ориентации', () => {
    expect(resolvePinnedGridViewport(1280, 1400)).toBe('large');
  });

  it('берёт small для книжной ориентации и для телефона боком', () => {
    expect(resolvePinnedGridViewport(810, 1080)).toBe('small');
    expect(resolvePinnedGridViewport(844, 390)).toBe('small');
    expect(resolvePinnedGridViewport(375, 812)).toBe('small');
  });
});

describe('computePinnedGridAreaSize', () => {
  describe('лента сбоку', () => {
    it('на эталонном экране витрина получает 1030', () => {
      expect(computePinnedGridAreaSize(1920, 1080)).toEqual({ width: 1030, height: 896 });
    });

    it('на типичном ноутбуке — 770', () => {
      expect(computePinnedGridAreaSize(1440, 900)).toEqual({ width: 770, height: 716 });
    });

    it('ровно на десктопном пороге — 610', () => {
      expect(computePinnedGridAreaSize(1280, 800)).toEqual({ width: 610, height: 616 });
    });

    it('на 1201 (сразу за потолком «лента ещё сбоку») — сбоку, витрине 531', () => {
      // 1201 − 120 = 1081 доступной: лента на минимуме 440, зазор эталон 110, витрине 531
      expect(computePinnedGridAreaSize(1201, 1080)).toEqual({ width: 531, height: 896 });
    });
  });

  describe('лента внизу', () => {
    it('на планшете альбомом 1180×820 — уже НЕ помещается рядом с лентой (NEWS_PAGE_ARCHIVE_BESIDE_MAX_SCREEN_WIDTH_PX = 1200, stream.Front#128/129) — лента вниз, витрине вся ширина', () => {
      // 1180 − 120 = 1060 доступной; порог из минимумов (960) это бы ещё
      // разрешил, но 1180 ≤ 1200 — потолок из news-layout.ts перевешивает.
      expect(computePinnedGridAreaSize(1180, 820)).toEqual({ width: 1060, height: null });
    });

    it('ровно на потолке (1200) — уже внизу', () => {
      expect(computePinnedGridAreaSize(1200, 1080)).toEqual({ width: 1080, height: null });
    });

    it('на 1024×768 витрина получает всю ширину, а не 134 точки — регрессия stream.Front#126', () => {
      // Пресет здесь large (альбом, 1024×768), но места на ленту сбоку нет:
      // 1024 − 120 = 904 < 960. Раньше холст считал по пресету и рисовал
      // 1024 − 120 − 110 − 660 = 134.
      expect(computePinnedGridAreaSize(1024, 768)).toEqual({ width: 904, height: null });
    });

    it('на планшете книжкой', () => {
      expect(computePinnedGridAreaSize(810, 1080)).toEqual({ width: 770, height: null });
    });

    it('на телефоне', () => {
      expect(computePinnedGridAreaSize(375, 812)).toEqual({ width: 335, height: null });
    });

    it('на минимальной поддерживаемой ширине', () => {
      expect(computePinnedGridAreaSize(320, 568)).toEqual({ width: 280, height: null });
    });
  });

  it('ни на одном размере приёмки витрина не выходит за доступную ширину', () => {
    const acceptanceSizes = [
      [320, 568],
      [390, 844],
      [844, 390],
      [768, 1024],
      [1024, 768],
      [1279, 800],
      [1280, 800],
      [1440, 900],
      [1919, 1080],
      [1920, 1080],
      [2560, 1440],
    ] as const;

    for (const [width, height] of acceptanceSizes) {
      const area = computePinnedGridAreaSize(width, height);

      expect(area.width).toBeGreaterThan(0);
      expect(area.width).toBeLessThanOrEqual(width);
    }
  });
});
