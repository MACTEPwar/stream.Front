import { TestBed } from '@angular/core/testing';

import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmModalData } from '@shared/components/confirm-modal/confirm-modal';
import { NewsItem } from '../../models/news.model';
import {
  DEFAULT_CARD_STYLE,
  PinnedGridConfig,
  PinnedGridLayout,
  PinnedGridViewport,
  PinnedNewsSlot,
} from '../../models/pinned-news-slot.model';
import { PinnedGridEditor } from './pinned-grid-editor';

function newsItem(id: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title: `Заголовок ${id}`,
    excerpt: 'Lorem ipsum dolor sit amet consectetur.',
    imageUrl: null,
    imageUrls: [],
    tagIds: [],
    views: 10,
    likes: 5,
    publishedAt: new Date(2023, 11, 6),
    viewedByCurrentUser: false,
    likedByCurrentUser: false,
    ...overrides,
  };
}

function slot(overrides: Partial<PinnedNewsSlot> = {}): PinnedNewsSlot {
  return {
    newsId: 'news-1',
    colStart: 1,
    rowStart: 1,
    colSpan: 1,
    rowSpan: 1,
    style: DEFAULT_CARD_STYLE,
    coverImageUrl: null,
    ...overrides,
  };
}

const GRID_CONFIG: PinnedGridConfig = { columns: 3, rows: 12 };
const EMPTY_LAYOUT: PinnedGridLayout = { config: GRID_CONFIG, slots: [] };

function stubHostRect(fixture: { nativeElement: HTMLElement }): void {
  vi.spyOn(fixture.nativeElement, 'getBoundingClientRect').mockReturnValue({
    width: 340,
    height: 820,
    top: 0,
    left: 0,
    right: 340,
    bottom: 820,
    x: 0,
    y: 0,
    toJSON: () => {},
  } as DOMRect);
}

function pointerEvent(clientX: number, clientY: number): PointerEvent {
  return { clientX, clientY, preventDefault: () => {}, stopPropagation: () => {} } as unknown as PointerEvent;
}

describe('PinnedGridEditor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PinnedGridEditor] });
  });

  // Дефолтный активный пресет редактора — 'middle', поэтому все "обычные"
  // тесты (не про раздельные раскладки) заводят данные именно под него,
  // small/large остаются пустыми дефолтами.
  function createEditor(news: NewsItem[], slots: PinnedNewsSlot[], gridConfig: PinnedGridConfig = GRID_CONFIG) {
    const fixture = TestBed.createComponent(PinnedGridEditor);
    fixture.componentRef.setInput('news', news);
    fixture.componentRef.setInput('layouts', {
      small: EMPTY_LAYOUT,
      middle: { config: gridConfig, slots },
      large: EMPTY_LAYOUT,
    } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
    fixture.detectChanges();
    return fixture;
  }

  it('рендерит карточку (app-news-card) на каждый слот', () => {
    const fixture = createEditor(
      [newsItem('news-1'), newsItem('news-2')],
      [slot({ newsId: 'news-1' }), slot({ newsId: 'news-2', colStart: 2 })],
    );

    expect(fixture.nativeElement.querySelectorAll('.pinned-grid-editor__card app-news-card').length).toBe(2);
  });

  it('на карточке — только «редактировать»/«удалить», без выбора новости/ориентации', () => {
    const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

    const controls = fixture.nativeElement.querySelector('.pinned-grid-editor__card-controls') as HTMLElement;
    expect(controls.querySelectorAll('app-select').length).toBe(0);
    expect(controls.querySelectorAll('app-button').length).toBe(2);
  });

  it('без слотов рендерит пустое состояние', () => {
    const fixture = createEditor([], []);
    expect(fixture.nativeElement.querySelector('.pinned-grid-editor__empty')).not.toBeNull();
  });

  it('отбрасывает осиротевшие слоты (newsId без соответствующей новости в news()) — не занимают ячейки', () => {
    // Регрессия stream.Front#118: после перехода справочника новостей на
    // реальный AdminNewsService старые моковые слоты ссылались на
    // несуществующие id и, хоть сами не рендерились, продолжали "занимать"
    // свои ячейки в isCellOccupied — новые карточки некуда было поставить.
    const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'ghost', colStart: 1, rowStart: 1 })]);

    expect(fixture.componentInstance['localSlots']()).toEqual([]);
    expect(fixture.componentInstance['isCellOccupied']({ col: 1, row: 1 })).toBe(false);
  });

  describe('позиционирование мышью', () => {
    it('drag: перетаскивание на одну ячейку вправо/вниз меняет colStart/rowStart', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1 }), slot({ newsId: 'news-2', colStart: 3, rowStart: 12 })],
      );
      stubHostRect(fixture);

      const dragged = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-1')!;
      fixture.componentInstance['onPointerDown'](pointerEvent(0, 0), dragged, 'move');
      fixture.componentInstance['onPointerMove'](pointerEvent(120, 70));
      fixture.componentInstance['commitDrag']();

      const moved = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-1')!;
      expect(moved.colStart).toBe(2);
      expect(moved.rowStart).toBe(2);
    });

    it('drag на уже занятую ячейку помечается невалидным и не применяется', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1 }), slot({ newsId: 'news-2', colStart: 2, rowStart: 1 })],
      );
      stubHostRect(fixture);

      const dragged = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-1')!;
      fixture.componentInstance['onPointerDown'](pointerEvent(0, 0), dragged, 'move');
      fixture.componentInstance['onPointerMove'](pointerEvent(120, 0));

      expect(fixture.componentInstance['dragState']()?.valid).toBe(false);

      fixture.componentInstance['commitDrag']();
      const unchanged = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-1')!;
      expect(unchanged.colStart).toBe(1);
    });

    it('resize: растягивание правого края увеличивает colSpan', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1', colStart: 1, rowStart: 1 })]);
      stubHostRect(fixture);

      const target = fixture.componentInstance['localSlots']()[0];
      fixture.componentInstance['onPointerDown'](pointerEvent(0, 0), target, 'col');
      fixture.componentInstance['onPointerMove'](pointerEvent(120, 0));
      fixture.componentInstance['commitDrag']();

      expect(fixture.componentInstance['localSlots']()[0].colSpan).toBe(2);
      expect(fixture.componentInstance['localSlots']()[0].colStart).toBe(1);
    });
  });

  describe('удаление/смена новости/ориентация', () => {
    it('убирает слот', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1' }), slot({ newsId: 'news-2', colStart: 2 })],
      );

      fixture.componentInstance['onRemoveSlot']('news-1');

      const slots: PinnedNewsSlot[] = fixture.componentInstance['localSlots']();
      expect(slots.map((s) => s.newsId)).toEqual(['news-2']);
    });

    it('смена новости в слоте меняет newsId, позиция/размер/стиль не трогаются', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1', colStart: 2, rowStart: 3, colSpan: 1, rowSpan: 2 })],
      );

      fixture.componentInstance['onSlotNewsChange']('news-1', 'news-2');

      expect(fixture.componentInstance['localSlots']()).toEqual([
        slot({ newsId: 'news-2', colStart: 2, rowStart: 3, colSpan: 1, rowSpan: 2 }),
      ]);
    });

    it('смена новости из drawer\'а редактирования переносит editingNewsId на новый id', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1', colStart: 2, rowStart: 3 })],
      );

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onEditFormNewsChange']('news-1', 'news-2');

      expect(fixture.componentInstance['editingNewsId']()).toBe('news-2');
      expect(fixture.componentInstance['editingSlot']()?.newsId).toBe('news-2');
      expect(fixture.componentInstance['localSlots']()[0].colStart).toBe(2);
    });

    it('переключает ориентацию (colSpan/rowSpan меняются местами)', () => {
      const fixture = createEditor(
        [newsItem('news-1')],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 3 })],
      );

      fixture.componentInstance['onToggleOrientation'](fixture.componentInstance['localSlots']()[0]);

      expect(fixture.componentInstance['localSlots']()[0]).toEqual(
        slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 3, rowSpan: 1 }),
      );
    });

    it('не переключает ориентацию, если результат пересёкся бы с другим слотом', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [
          slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 3 }),
          slot({ newsId: 'news-2', colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 }),
        ],
      );

      expect(fixture.componentInstance['canToggleOrientation'](fixture.componentInstance['localSlots']()[0])).toBe(
        false,
      );
    });
  });

  describe('добавление карточки', () => {
    it('«Добавить новость» открывает drawer и сбрасывает форму', () => {
      const fixture = createEditor([newsItem('news-1'), newsItem('news-2')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onAddClick']();

      expect(fixture.componentInstance['addDrawerVisible']()).toBe(true);
      expect(fixture.componentInstance['unusedNewsForAdd']().map((n: NewsItem) => n.id)).toEqual(['news-2']);
    });

    it('отправка формы закрывает drawer и переводит в режим расстановки', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2', { imageUrls: ['/cover.png', '/cover-2.png'] })],
        [slot({ newsId: 'news-1' })],
      );

      fixture.componentInstance['onAddClick']();
      fixture.componentInstance['onAddFormNewsChange']('news-2');
      expect(fixture.componentInstance['addFormNewsImages']()).toEqual(['/cover.png', '/cover-2.png']);

      fixture.componentInstance['addFormCoverUrl'].set('/cover.png');
      fixture.componentInstance['onAddFormSubmit']();

      expect(fixture.componentInstance['addDrawerVisible']()).toBe(false);
      expect(fixture.componentInstance['pendingNews']()).toEqual({ newsId: 'news-2', coverImageUrl: '/cover.png' });
    });

    it('смена новости в форме добавления сбрасывает выбранную обложку', () => {
      const fixture = createEditor([newsItem('news-1'), newsItem('news-2', { imageUrls: ['/cover.png'] })], []);

      fixture.componentInstance['onAddFormNewsChange']('news-2');
      fixture.componentInstance['addFormCoverUrl'].set('/cover.png');
      fixture.componentInstance['onAddFormNewsChange']('news-1');

      expect(fixture.componentInstance['addFormCoverUrl']()).toBeNull();
      expect(fixture.componentInstance['addFormNewsImages']()).toEqual([]);
    });

    it('без выбранной обложки coverImageUrl остаётся null (используется своя картинка новости)', () => {
      const fixture = createEditor([newsItem('news-1'), newsItem('news-2')], []);

      fixture.componentInstance['onAddFormNewsChange']('news-2');
      fixture.componentInstance['onAddFormSubmit']();

      expect(fixture.componentInstance['pendingNews']()).toEqual({ newsId: 'news-2', coverImageUrl: null });
    });

    it('drag-прямоугольник по свободным ячейкам создаёт новый слот с выбранной обложкой', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1 })],
      );

      fixture.componentInstance['pendingNews'].set({ newsId: 'news-2', coverImageUrl: '/cover.png' });
      fixture.componentInstance['onPlacementCellPointerDown']({ col: 2, row: 1 });
      fixture.componentInstance['onPlacementCellPointerEnter']({ col: 3, row: 2 });
      window.dispatchEvent(new Event('pointerup'));

      const added = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-2');
      expect(added).toEqual(
        slot({ newsId: 'news-2', colStart: 2, rowStart: 1, colSpan: 2, rowSpan: 2, coverImageUrl: '/cover.png' }),
      );
      expect(fixture.componentInstance['pendingNews']()).toBeNull();
    });

    it('drag-прямоугольник по уже занятой ячейке — toast-ошибка, остаёмся в режиме расстановки', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1 })],
      );
      const notificationService = TestBed.inject(NotificationService);
      const showSpy = vi.spyOn(notificationService, 'show');

      fixture.componentInstance['pendingNews'].set({ newsId: 'news-2', coverImageUrl: null });
      // Старт на свободной ячейке (2,1), затем протягиваем в занятую (1,1) —
      // сам старт на занятой ячейке no-op (`onPlacementCellPointerDown` не
      // запускает drag), ошибка должна ловиться уже на пересечении при drag.
      fixture.componentInstance['onPlacementCellPointerDown']({ col: 2, row: 1 });
      fixture.componentInstance['onPlacementCellPointerEnter']({ col: 1, row: 1 });
      window.dispatchEvent(new Event('pointerup'));

      expect(showSpy).toHaveBeenCalledWith('Эти ячейки уже заняты — выберите другую область', 'error');
      expect(fixture.componentInstance['pendingNews']()).not.toBeNull();
      expect(fixture.componentInstance['localSlots']().some((s: PinnedNewsSlot) => s.newsId === 'news-2')).toBe(false);
    });

    it('«Отменить добавление» выходит из режима расстановки без создания слота', () => {
      const fixture = createEditor([newsItem('news-1')], []);

      fixture.componentInstance['pendingNews'].set({ newsId: 'news-1', coverImageUrl: null });
      fixture.componentInstance['onCancelPlacement']();

      expect(fixture.componentInstance['pendingNews']()).toBeNull();
      expect(fixture.componentInstance['localSlots']()).toEqual([]);
    });
  });

  describe('редактирование карточки (drawer)', () => {
    it('открывает drawer с копией текущего стиля и editingSlot', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);

      expect(fixture.componentInstance['editingNewsId']()).toBe('news-1');
      expect(fixture.componentInstance['draftStyle']()).toEqual(DEFAULT_CARD_STYLE);
      expect(fixture.componentInstance['editingSlot']()?.newsId).toBe('news-1');
    });

    it('«Сохранить» переносит draftStyle в localSlots и закрывает drawer', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onImagePositionChange']('left');
      fixture.componentInstance['onDraftStyleNumberInput']('imageScale', '2');
      fixture.componentInstance['onDraftColorInput']('backgroundColor', '#000000');
      fixture.componentInstance['onSaveStyleClick']();

      expect(fixture.componentInstance['editingNewsId']()).toBeNull();
      expect(fixture.componentInstance['localSlots']()[0].style).toEqual({
        ...DEFAULT_CARD_STYLE,
        imagePosition: 'left',
        imageScale: 2,
        backgroundColor: '#000000',
      });
    });

    it('«Отмена» закрывает drawer без изменений стиля', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onDraftStyleNumberInput']('imageScale', '2');
      fixture.componentInstance['onCancelStyleClick']();

      expect(fixture.componentInstance['editingNewsId']()).toBeNull();
      expect(fixture.componentInstance['localSlots']()[0].style).toEqual(DEFAULT_CARD_STYLE);
    });

    it('закрытие через Esc/backdrop (onStyleDrawerVisibleChange(false)) равносильно «Отмена»', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onStyleDrawerVisibleChange'](false);

      expect(fixture.componentInstance['editingNewsId']()).toBeNull();
      expect(fixture.componentInstance['draftStyle']()).toBeNull();
    });
  });

  describe('размер сетки', () => {
    it('увеличение размера применяется сразу, без подтверждения', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);
      const modalService = TestBed.inject(ModalService);
      const openSpy = vi.spyOn(modalService, 'open');

      fixture.componentInstance['columnsDraft'].set(5);
      fixture.componentInstance['rowsDraft'].set(20);
      fixture.componentInstance['onApplyGridSizeClick']();

      expect(openSpy).not.toHaveBeenCalled();
      expect(fixture.componentInstance['localGridConfig']()).toEqual({ columns: 5, rows: 20 });
    });

    it('уменьшение, обрезающее/удаляющее слоты, требует подтверждения через ConfirmModal', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [
          slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 3, rowSpan: 12 }),
          slot({ newsId: 'news-2', colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 1 }),
        ],
      );
      const modalService = TestBed.inject(ModalService);
      const openSpy = vi.spyOn(modalService, 'open');

      fixture.componentInstance['columnsDraft'].set(2);
      fixture.componentInstance['rowsDraft'].set(12);
      fixture.componentInstance['onApplyGridSizeClick']();

      expect(openSpy).toHaveBeenCalled();
      expect(fixture.componentInstance['localGridConfig']()).toEqual(GRID_CONFIG);

      const data = openSpy.mock.calls[0][1] as ConfirmModalData;
      data.onConfirm();

      expect(fixture.componentInstance['localGridConfig']()).toEqual({ columns: 2, rows: 12 });
      const slots: PinnedNewsSlot[] = fixture.componentInstance['localSlots']();
      expect(slots.find((s) => s.newsId === 'news-1')?.colSpan).toBe(2);
      expect(slots.some((s) => s.newsId === 'news-2')).toBe(false);
    });
  });

  describe('раздельные раскладки по вьюпортам', () => {
    it('переключение пресета переключает и размер сетки, и набор карточек', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1'), newsItem('news-2')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: { columns: 2, rows: 6 }, slots: [slot({ newsId: 'news-1' })] },
        middle: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-2' })] },
        large: EMPTY_LAYOUT,
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      expect(fixture.componentInstance['localGridConfig']()).toEqual(GRID_CONFIG);
      expect(fixture.componentInstance['localSlots']().map((s: PinnedNewsSlot) => s.newsId)).toEqual(['news-2']);

      fixture.componentInstance['onViewportPresetChange']('small');

      expect(fixture.componentInstance['localGridConfig']()).toEqual({ columns: 2, rows: 6 });
      expect(fixture.componentInstance['localSlots']().map((s: PinnedNewsSlot) => s.newsId)).toEqual(['news-1']);
    });

    it('правки в одном пресете не затрагивают другие', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1'), newsItem('news-2')]);
      fixture.componentRef.setInput('layouts', {
        small: EMPTY_LAYOUT,
        middle: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-2' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onRemoveSlot']('news-1');
      expect(fixture.componentInstance['localSlots']()).toEqual([]);

      fixture.componentInstance['onViewportPresetChange']('large');
      expect(fixture.componentInstance['localSlots']().map((s: PinnedNewsSlot) => s.newsId)).toEqual(['news-2']);
    });

    it('«Сохранить» эмитит все три раскладки разом', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);
      const saveSpy = vi.fn();
      fixture.componentInstance.save.subscribe(saveSpy);

      fixture.componentInstance['onSaveClick']();

      expect(saveSpy).toHaveBeenCalledWith({
        small: EMPTY_LAYOUT,
        middle: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
        large: EMPTY_LAYOUT,
      });
    });

    it('«Сохранить» отбрасывает осиротевшие слоты во всех трёх раскладках', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: GRID_CONFIG, slots: [slot({ newsId: 'ghost' })] },
        middle: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
        large: EMPTY_LAYOUT,
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      const saveSpy = vi.fn();
      fixture.componentInstance.save.subscribe(saveSpy);
      fixture.componentInstance['onSaveClick']();

      const emitted = saveSpy.mock.calls[0][0] as Record<PinnedGridViewport, PinnedGridLayout>;
      expect(emitted.small.slots).toEqual([]);
      expect(emitted.middle.slots).toEqual([slot({ newsId: 'news-1' })]);
    });
  });

  describe('симулятор вьюпорта', () => {
    it('«Маленький» — высота редактируемая вручную, ширина фиксирована 375', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onViewportPresetChange']('small');
      fixture.componentInstance['onSmallViewportHeightInput']('500');

      expect(fixture.componentInstance['viewportSize']()).toEqual({ width: 375, height: 500 });
    });

    it('«Средний»/«Большой» — строго фиксированы пресетом, не зависят от smallViewportHeightPx', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onSmallViewportHeightInput']('999');
      fixture.componentInstance['onViewportPresetChange']('middle');

      expect(fixture.componentInstance['viewportSize']()).toEqual({ width: 768, height: 432 });
    });
  });
});
