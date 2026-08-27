import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AdminNewsService } from '@features/admin/services/admin-news.service';
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
    images: [],
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
    focalPoint: null,
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
    TestBed.configureTestingModule({
      imports: [PinnedGridEditor],
      providers: [{ provide: AdminNewsService, useValue: { updateImageFocalPoint: vi.fn().mockReturnValue(of({})) } }],
    });
  });

  // Дефолтный экран редактора — «Планшет альбомом» (1180×820, резолвится в
  // 'large' — альбомная ориентация ≥768×600), поэтому все "обычные" тесты
  // заводят данные под раскладку 'large', 'small' остаётся пустым дефолтом.
  function createEditor(news: NewsItem[], slots: PinnedNewsSlot[], gridConfig: PinnedGridConfig = GRID_CONFIG) {
    const fixture = TestBed.createComponent(PinnedGridEditor);
    fixture.componentRef.setInput('news', news);
    fixture.componentRef.setInput('layouts', {
      small: EMPTY_LAYOUT,
      large: { config: gridConfig, slots },
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
    const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'ghost', colStart: 1, rowStart: 1 })]);

    expect(fixture.componentInstance['localSlots']()).toEqual([]);
    expect(fixture.componentInstance['isCellOccupied']({ col: 1, row: 1 })).toBe(false);
  });

  describe('общий набор закреплённых новостей между раскладками', () => {
    it('новость, размещённая только в large, авто-появляется в small как 1×1 на первой свободной ячейке', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: EMPTY_LAYOUT,
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2 })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onScreenPresetChange']('phone');

      expect(fixture.componentInstance['viewportPreset']()).toBe('small');
      const autoSlot = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-1')!;
      expect(autoSlot).toBeDefined();
      expect(autoSlot.colSpan).toBe(1);
      expect(autoSlot.rowSpan).toBe(1);
    });

    it('открепление убирает новость из обеих раскладок', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: EMPTY_LAYOUT,
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onRemoveSlot']('news-1');
      fixture.componentInstance['onScreenPresetChange']('phone');

      expect(fixture.componentInstance['localSlots']()).toEqual([]);
    });

    it('в small при нехватке места автоматически растёт число строк', () => {
      const fullSlots: PinnedNewsSlot[] = [slot({ newsId: 'existing', colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 6 })];
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('existing'), newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: { columns: 2, rows: 6 }, slots: fullSlots },
        large: { config: GRID_CONFIG, slots: [...fullSlots, slot({ newsId: 'news-1', colStart: 3, rowStart: 1 })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onScreenPresetChange']('phone');

      expect(fixture.componentInstance['localGridConfig']().rows).toBe(7);
      const autoSlot = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-1')!;
      expect(autoSlot.rowStart).toBe(7);
    });

    it('в large при нехватке места новость уходит в unplacedForLarge, не пропадает', () => {
      // Раскладка large заполнена ПОЛНОСТЬЮ (1×1), место есть только на small
      // (новость закреплена только там) — auto-размещение на large невозможно.
      const fullLargeSlots: PinnedNewsSlot[] = [slot({ newsId: 'existing', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 })];
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('existing'), newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: { columns: 2, rows: 1 }, slots: [...fullLargeSlots, slot({ newsId: 'news-1', colStart: 2, rowStart: 1 })] },
        large: { config: { columns: 1, rows: 1 }, slots: fullLargeSlots },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      // Дефолтный экран редактора резолвится в 'large'.
      expect(fixture.componentInstance['viewportPreset']()).toBe('large');
      expect(fixture.componentInstance['localSlots']().some((s: PinnedNewsSlot) => s.newsId === 'news-1')).toBe(false);
      expect(fixture.componentInstance['unplacedForLarge']().map((item: NewsItem) => item.id)).toEqual(['news-1']);
    });

    it('редактирование стиля переносится на обе раскладки (общий стиль/обложка)', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: EMPTY_LAYOUT,
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onImagePositionChange']('left');
      fixture.componentInstance['onSaveStyleClick']();

      expect(fixture.componentInstance['localSlots']()[0].style.imagePosition).toBe('left');

      fixture.componentInstance['onScreenPresetChange']('phone');
      const autoSlot = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-1')!;
      expect(autoSlot.style.imagePosition).toBe('left');
    });
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

    it('открывает drawer с копией текущей обложки слота (draftCoverImageUrl)', () => {
      const fixture = createEditor(
        [newsItem('news-1', { imageUrls: ['/a.png', '/b.png'] })],
        [slot({ newsId: 'news-1', coverImageUrl: '/a.png' })],
      );

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);

      expect(fixture.componentInstance['draftCoverImageUrl']()).toBe('/a.png');
      expect(fixture.componentInstance['editingNewsImages']()).toEqual(['/a.png', '/b.png']);
    });

    it('«Без обложки» сбрасывает draftCoverImageUrl в null, «Сохранить» переносит это в слот', () => {
      const fixture = createEditor(
        [newsItem('news-1', { imageUrls: ['/a.png'] })],
        [slot({ newsId: 'news-1', coverImageUrl: '/a.png' })],
      );

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onDraftCoverImageChange'](null);
      fixture.componentInstance['onSaveStyleClick']();

      expect(fixture.componentInstance['localSlots']()[0].coverImageUrl).toBeNull();
    });

    it('выбор другой картинки из галереи и «Сохранить» переносит её в coverImageUrl слота', () => {
      const fixture = createEditor(
        [newsItem('news-1', { imageUrls: ['/a.png', '/b.png'] })],
        [slot({ newsId: 'news-1', coverImageUrl: '/a.png' })],
      );

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onDraftCoverImageChange']('/b.png');
      fixture.componentInstance['onSaveStyleClick']();

      expect(fixture.componentInstance['localSlots']()[0].coverImageUrl).toBe('/b.png');
    });

    it('«Сохранить» переносит draftStyle в localSlots и закрывает drawer', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onImagePositionChange']('left');
      fixture.componentInstance['onDraftColorInput']('backgroundColor', '#000000');
      fixture.componentInstance['onSaveStyleClick']();

      expect(fixture.componentInstance['editingNewsId']()).toBeNull();
      expect(fixture.componentInstance['localSlots']()[0].style).toEqual({
        ...DEFAULT_CARD_STYLE,
        imagePosition: 'left',
        backgroundColor: '#000000',
      });
    });

    it('«Отмена» закрывает drawer без изменений стиля', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onDraftStyleNumberInput']('imageSizePercent', '80');
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
      expect(fixture.componentInstance['draftCoverImageUrl']()).toBeNull();
    });

    it('FocalPointPicker отсутствует, если у новости нет картинок', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-focal-point-picker')).toBeNull();
    });

    it('FocalPointPicker показан для обложки слота и правка вызывает AdminNewsService.updateImageFocalPoint', () => {
      const fixture = createEditor(
        [
          newsItem('news-1', {
            imageUrls: ['/a.png'],
            images: [{ id: 'img-1', url: '/a.png', focalX: null, focalY: null }],
          }),
        ],
        [slot({ newsId: 'news-1', coverImageUrl: '/a.png' })],
      );
      const adminNewsService = TestBed.inject(AdminNewsService);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-focal-point-picker')).not.toBeNull();

      fixture.componentInstance['onFocalPointChange']({ x: 20, y: 80 });

      expect(adminNewsService.updateImageFocalPoint).toHaveBeenCalledWith('img-1', { focalX: 20, focalY: 80 });
      expect(fixture.componentInstance['editingFocalPoint']()).toEqual({ x: 20, y: 80 });
    });

    it('ошибка сохранения откатывает точку к ПОСЛЕДНЕЙ известной сохранённой (не к центру), если у картинки уже была точка', () => {
      TestBed.overrideProvider(AdminNewsService, {
        useValue: { updateImageFocalPoint: vi.fn().mockReturnValue(throwError(() => new Error('boom'))) },
      });
      const fixture = createEditor(
        [
          newsItem('news-1', {
            imageUrls: ['/a.png'],
            images: [{ id: 'img-1', url: '/a.png', focalX: 30, focalY: 40 }],
          }),
        ],
        [slot({ newsId: 'news-1', coverImageUrl: '/a.png' })],
      );

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.detectChanges();

      expect(fixture.componentInstance['editingFocalPoint']()).toEqual({ x: 30, y: 40 });

      fixture.componentInstance['onFocalPointChange']({ x: 90, y: 90 });

      expect(fixture.componentInstance['editingFocalPoint']()).toEqual({ x: 30, y: 40 });
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
    it('переключение пресета переключает и размер сетки, и позиции карточек', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1'), newsItem('news-2')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: { columns: 2, rows: 6 }, slots: [slot({ newsId: 'news-1' })] },
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-2' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      expect(fixture.componentInstance['localGridConfig']()).toEqual(GRID_CONFIG);

      fixture.componentInstance['onScreenPresetChange']('phone');

      expect(fixture.componentInstance['localGridConfig']()).toEqual({ columns: 2, rows: 6 });
      const news1Slot = fixture.componentInstance['localSlots']().find((s: PinnedNewsSlot) => s.newsId === 'news-1')!;
      expect(news1Slot.colStart).toBe(1);
      expect(news1Slot.rowStart).toBe(1);
    });

    it('«Сохранить» эмитит обе раскладки разом', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);
      const saveSpy = vi.fn();
      fixture.componentInstance.save.subscribe(saveSpy);

      fixture.componentInstance['onSaveClick']();

      const emitted = saveSpy.mock.calls[0][0] as Record<PinnedGridViewport, PinnedGridLayout>;
      expect(emitted.large.slots.map((s: PinnedNewsSlot) => s.newsId)).toEqual(['news-1']);
      expect(emitted.small.slots.map((s: PinnedNewsSlot) => s.newsId)).toEqual(['news-1']);
    });

    it('«Сохранить» отбрасывает осиротевшие слоты в обеих раскладках', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: GRID_CONFIG, slots: [slot({ newsId: 'ghost' })] },
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      const saveSpy = vi.fn();
      fixture.componentInstance.save.subscribe(saveSpy);
      fixture.componentInstance['onSaveClick']();

      const emitted = saveSpy.mock.calls[0][0] as Record<PinnedGridViewport, PinnedGridLayout>;
      expect(emitted.small.slots.some((s: PinnedNewsSlot) => s.newsId === 'ghost')).toBe(false);
      expect(emitted.large.slots.map((s: PinnedNewsSlot) => s.newsId)).toEqual(['news-1']);
    });
  });

  describe('геометрия холста (реальный экран, не 16:9-пресет)', () => {
    it('«Телефон» (375×812) резолвится в раскладку small, ширина холста = экран минус паддинг страницы на small (20px), высота не фиксирована', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onScreenPresetChange']('phone');

      expect(fixture.componentInstance['viewportPreset']()).toBe('small');
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({ width: 375 - 2 * 20, height: null });
    });

    it('«Планшет книжкой» (810×1080) резолвится в раскладку small', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onScreenPresetChange']('tablet-portrait');

      expect(fixture.componentInstance['viewportPreset']()).toBe('small');
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({ width: 810 - 2 * 20, height: null });
    });

    it('«Планшет альбомом» (1180×820) резолвится в раскладку large', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onScreenPresetChange']('tablet-landscape');

      expect(fixture.componentInstance['viewportPreset']()).toBe('large');
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({
        width: 1180 - 2 * 60 - 660 - 110,
        height: 820 - 64 - 2 * 60,
      });
    });

    it('«Ноутбук» (1366×768) резолвится в раскладку large, холст = экран минус паддинги/архив/шапку (зеркало news-page.scss/shell.scss)', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onScreenPresetChange']('laptop');

      expect(fixture.componentInstance['viewportPreset']()).toBe('large');
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({
        width: 1366 - 2 * 60 - 660 - 110,
        height: 768 - 64 - 2 * 60,
      });
    });

    it('«Десктоп» (1920×1080) резолвится в раскладку large с той же формулой', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onScreenPresetChange']('desktop');

      expect(fixture.componentInstance['viewportPreset']()).toBe('large');
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({
        width: 1920 - 2 * 60 - 660 - 110,
        height: 1080 - 64 - 2 * 60,
      });
    });

    it('«Свой размер» — произвольные ширина/высота, тот же пересчёт раскладки/геометрии', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onScreenPresetChange']('custom');
      fixture.componentInstance['onCustomScreenWidthInput']('500');
      fixture.componentInstance['onCustomScreenHeightInput']('900');

      expect(fixture.componentInstance['viewportPreset']()).toBe('small');
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({ width: 500 - 2 * 20, height: null });
    });
  });

  describe('строки холста редактора на small (баг «лишний скролл, странный вид» — пустые 1fr-строки схлопывались в 0)', () => {
    it('на small (высота холста не фиксирована) строки получают минимальный видимый пол через minmax', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onScreenPresetChange']('phone');

      expect(fixture.componentInstance['gridAreaSize']().height).toBeNull();
      expect(fixture.componentInstance['gridTemplateRows']()).toBe(`repeat(${fixture.componentInstance['localGridConfig']().rows}, minmax(160px, 1fr))`);
    });

    it('на large (высота холста фиксирована) строки честно делят её — голый 1fr, без пола', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onScreenPresetChange']('laptop');

      expect(fixture.componentInstance['gridAreaSize']().height).not.toBeNull();
      expect(fixture.componentInstance['gridTemplateRows']()).toBe(`repeat(${fixture.componentInstance['localGridConfig']().rows}, 1fr)`);
    });
  });

  describe('предпросмотр «как увидит посетитель» (iframe)', () => {
    it('«Предпросмотр» включает previewMode, iframe получает размер выбранного экрана', () => {
      const fixture = createEditor([], []);
      fixture.componentInstance['onScreenPresetChange']('laptop');

      fixture.componentInstance['onOpenPreviewClick']();

      expect(fixture.componentInstance['previewMode']()).toBe(true);
      expect(fixture.componentInstance['screenSize']()).toMatchObject({ width: 1366, height: 768 });
    });

    it('«Обновить предпросмотр» меняет src (форсирует перезагрузку iframe)', () => {
      const fixture = createEditor([], []);
      const before = fixture.componentInstance['previewSrc']();

      fixture.componentInstance['onRefreshPreviewClick']();
      const after = fixture.componentInstance['previewSrc']();

      expect(after).not.toBe(before);
    });

    it('«Закрыть предпросмотр» выключает previewMode', () => {
      const fixture = createEditor([], []);
      fixture.componentInstance['onOpenPreviewClick']();

      fixture.componentInstance['onClosePreviewClick']();

      expect(fixture.componentInstance['previewMode']()).toBe(false);
    });
  });
});
