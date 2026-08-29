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

const PINNED_CONTENT = {
  title: 'Заголовок закреплённой',
  description: 'Описание закреплённой',
  publishedAt: '2023-12-06T00:00:00.000Z',
  viewCount: 100,
  likeCount: 10,
  likedByCurrentUser: false,
  viewedByCurrentUser: false,
  tags: [],
};

function newsItem(id: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title: `Заголовок ${id}`,
    excerpt: 'Lorem ipsum dolor sit amet consectetur.',
    cover: { type: 'none', url: null, focalPoint: null, variants: [] },
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
    cover: { type: 'none', url: null, focalPoint: null, variants: [] },
    news: PINNED_CONTENT,
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
  return {
    clientX,
    clientY,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as PointerEvent;
}

describe('PinnedGridEditor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PinnedGridEditor],
      providers: [
        {
          provide: AdminNewsService,
          useValue: {
            updateImageFocalPoint: vi.fn().mockReturnValue(of({})),
            update: vi.fn().mockReturnValue(of({})),
          },
        },
      ],
    });
  });

  // Дефолтный экран редактора — «Планшет альбомом» (1180×820, резолвится в
  // 'large' — альбомная ориентация ≥768×600), поэтому все "обычные" тесты
  // заводят данные под раскладку 'large', 'small' остаётся пустым дефолтом.
  function createEditor(
    news: NewsItem[],
    slots: PinnedNewsSlot[],
    gridConfig: PinnedGridConfig = GRID_CONFIG,
  ) {
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

    expect(
      fixture.nativeElement.querySelectorAll('.pinned-grid-editor__card app-news-card').length,
    ).toBe(2);
  });

  it('на карточке — только «редактировать»/«удалить», без выбора новости/ориентации', () => {
    const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

    const controls = fixture.nativeElement.querySelector(
      '.pinned-grid-editor__card-controls',
    ) as HTMLElement;
    expect(controls.querySelectorAll('app-select').length).toBe(0);
    expect(controls.querySelectorAll('app-button').length).toBe(2);
  });

  it('без слотов рендерит пустое состояние', () => {
    const fixture = createEditor([], []);
    expect(fixture.nativeElement.querySelector('.pinned-grid-editor__empty')).not.toBeNull();
  });

  it('отбрасывает осиротевшие слоты (newsId без соответствующей новости в news()) — не занимают ячейки', () => {
    const fixture = createEditor(
      [newsItem('news-1')],
      [slot({ newsId: 'ghost', colStart: 1, rowStart: 1 })],
    );

    expect(fixture.componentInstance['localSlots']()).toEqual([]);
    expect(fixture.componentInstance['isCellOccupied']({ col: 1, row: 1 })).toBe(false);
  });

  describe('размещение — всегда явное действие (РАС-Ф-02, stream.Front#128)', () => {
    it('новость, размещённая только в large, НЕ появляется в small сама — редактор больше не занимает ячейки за админа', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: EMPTY_LAYOUT,
        large: {
          config: GRID_CONFIG,
          slots: [slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2 })],
        },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onViewportChange']('small');

      expect(fixture.componentInstance['viewportPreset']()).toBe('small');
      expect(fixture.componentInstance['localSlots']()).toEqual([]);
    });

    it('открепление убирает новость из обеих раскладок', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onRemoveSlot']('news-1');
      fixture.componentInstance['onViewportChange']('small');

      expect(fixture.componentInstance['localSlots']()).toEqual([]);
    });

    it('редактирование стиля переносится на обе раскладки, где новость РЕАЛЬНО размещена (общий стиль/обложка)', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.componentInstance['onImagePositionChange']('left');
      fixture.componentInstance['onSaveStyleClick']();

      expect(fixture.componentInstance['localSlots']()[0].style.imagePosition).toBe('left');

      fixture.componentInstance['onViewportChange']('small');
      const smallSlot = fixture.componentInstance['localSlots']().find(
        (s: PinnedNewsSlot) => s.newsId === 'news-1',
      )!;
      expect(smallSlot.style.imagePosition).toBe('left');
    });

    it('pinnedNewsList показывает бейджи размещения по раскладкам (РАС-Ф-05)', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: EMPTY_LAYOUT,
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      const list = fixture.componentInstance['pinnedNewsList']();
      expect(list).toEqual([{ newsId: 'news-1', item: expect.anything(), placedIn: ['large'] }]);
    });

    it('«Разместить здесь» из pinnedNewsList переводит в режим расстановки в ТЕКУЩЕЙ раскладке', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: EMPTY_LAYOUT,
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onViewportChange']('small');
      fixture.componentInstance['onPlaceInCurrentViewportClick']('news-1');
      fixture.componentInstance['onPlacementCellPointerDown']({ col: 1, row: 1 });
      window.dispatchEvent(new Event('pointerup'));

      const placed = fixture.componentInstance['localSlots']().find(
        (s: PinnedNewsSlot) => s.newsId === 'news-1',
      );
      expect(placed).toBeDefined();
      expect(fixture.componentInstance['pinnedNewsList']()[0].placedIn.sort()).toEqual([
        'large',
        'small',
      ]);
    });
  });

  describe('позиционирование мышью', () => {
    it('drag: перетаскивание на одну ячейку вправо/вниз меняет colStart/rowStart', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [
          slot({ newsId: 'news-1', colStart: 1, rowStart: 1 }),
          slot({ newsId: 'news-2', colStart: 3, rowStart: 12 }),
        ],
      );
      stubHostRect(fixture);

      const dragged = fixture.componentInstance['localSlots']().find(
        (s: PinnedNewsSlot) => s.newsId === 'news-1',
      )!;
      fixture.componentInstance['onPointerDown'](pointerEvent(0, 0), dragged, 'move');
      fixture.componentInstance['onPointerMove'](pointerEvent(120, 70));
      fixture.componentInstance['commitDrag']();

      const moved = fixture.componentInstance['localSlots']().find(
        (s: PinnedNewsSlot) => s.newsId === 'news-1',
      )!;
      expect(moved.colStart).toBe(2);
      expect(moved.rowStart).toBe(2);
    });

    it('drag на уже занятую ячейку помечается невалидным и не применяется', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [
          slot({ newsId: 'news-1', colStart: 1, rowStart: 1 }),
          slot({ newsId: 'news-2', colStart: 2, rowStart: 1 }),
        ],
      );
      stubHostRect(fixture);

      const dragged = fixture.componentInstance['localSlots']().find(
        (s: PinnedNewsSlot) => s.newsId === 'news-1',
      )!;
      fixture.componentInstance['onPointerDown'](pointerEvent(0, 0), dragged, 'move');
      fixture.componentInstance['onPointerMove'](pointerEvent(120, 0));

      expect(fixture.componentInstance['dragState']()?.valid).toBe(false);

      fixture.componentInstance['commitDrag']();
      const unchanged = fixture.componentInstance['localSlots']().find(
        (s: PinnedNewsSlot) => s.newsId === 'news-1',
      )!;
      expect(unchanged.colStart).toBe(1);
    });

    it('resize: растягивание правого края увеличивает colSpan', () => {
      const fixture = createEditor(
        [newsItem('news-1')],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1 })],
      );
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

      // Содержимое пересобирается из NewsItem новой новости, поэтому
      // сверяем положение/размер/стиль, а не весь слот целиком (stream.Front#133)
      const slots = fixture.componentInstance['localSlots']();
      expect(slots).toHaveLength(1);
      expect(slots[0]).toMatchObject({
        newsId: 'news-2',
        colStart: 2,
        rowStart: 3,
        colSpan: 1,
        rowSpan: 2,
        style: DEFAULT_CARD_STYLE,
      });
    });

    it("смена новости из drawer'а редактирования переносит editingNewsId на новый id", () => {
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

      fixture.componentInstance['onToggleOrientation'](
        fixture.componentInstance['localSlots']()[0],
      );

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

      expect(
        fixture.componentInstance['canToggleOrientation'](
          fixture.componentInstance['localSlots']()[0],
        ),
      ).toBe(false);
    });
  });

  describe('добавление карточки', () => {
    it('«Добавить новость» открывает drawer и сбрасывает форму — в списке только то, что ещё не занимает место в ТЕКУЩЕЙ раскладке', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1' })],
      );

      fixture.componentInstance['onAddClick']();

      expect(fixture.componentInstance['addDrawerVisible']()).toBe(true);
      expect(fixture.componentInstance['newsForAdd']().map((n: NewsItem) => n.id)).toEqual([
        'news-2',
      ]);
    });

    it('новость, закреплённая только в ДРУГОЙ раскладке, — ЕСТЬ в списке добавления (по прямому запросу пользователя: раньше список фильтровался по обеим раскладкам разом и на полностью заполненной раскладке выглядел пустым/сломанным)', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1')]);
      fixture.componentRef.setInput('layouts', {
        small: EMPTY_LAYOUT,
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onViewportChange']('small');

      expect(fixture.componentInstance['newsForAdd']().map((n: NewsItem) => n.id)).toEqual([
        'news-1',
      ]);
    });

    it('отправка формы закрывает drawer и переводит в режим расстановки', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2', { imageUrls: ['/cover.png', '/cover-2.png'] })],
        [slot({ newsId: 'news-1' })],
      );

      fixture.componentInstance['onAddClick']();
      fixture.componentInstance['onAddFormNewsChange']('news-2');
      expect(fixture.componentInstance['addFormNewsImages']()).toEqual([
        '/cover.png',
        '/cover-2.png',
      ]);

      fixture.componentInstance['onAddFormSubmit']();

      expect(fixture.componentInstance['addDrawerVisible']()).toBe(false);
      expect(fixture.componentInstance['pendingNews']()).toEqual({
        newsId: 'news-2',
      });
    });

    it('drag-прямоугольник по свободным ячейкам создаёт новый слот', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1 })],
      );

      fixture.componentInstance['pendingNews'].set({ newsId: 'news-2' });
      fixture.componentInstance['onPlacementCellPointerDown']({ col: 2, row: 1 });
      fixture.componentInstance['onPlacementCellPointerEnter']({ col: 3, row: 2 });
      window.dispatchEvent(new Event('pointerup'));

      const added = fixture.componentInstance['localSlots']().find(
        (s: PinnedNewsSlot) => s.newsId === 'news-2',
      );
      expect(added).toMatchObject({
        newsId: 'news-2',
        colStart: 2,
        rowStart: 1,
        colSpan: 2,
        rowSpan: 2,
      });
      expect(fixture.componentInstance['pendingNews']()).toBeNull();
    });

    it('drag-прямоугольник по уже занятой ячейке — toast-ошибка, остаёмся в режиме расстановки', () => {
      const fixture = createEditor(
        [newsItem('news-1'), newsItem('news-2')],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1 })],
      );
      const notificationService = TestBed.inject(NotificationService);
      const showSpy = vi.spyOn(notificationService, 'show');

      fixture.componentInstance['pendingNews'].set({ newsId: 'news-2' });
      fixture.componentInstance['onPlacementCellPointerDown']({ col: 2, row: 1 });
      fixture.componentInstance['onPlacementCellPointerEnter']({ col: 1, row: 1 });
      window.dispatchEvent(new Event('pointerup'));

      expect(showSpy).toHaveBeenCalledWith(
        'Эти ячейки уже заняты — выберите другую область',
        'error',
      );
      expect(fixture.componentInstance['pendingNews']()).not.toBeNull();
      expect(
        fixture.componentInstance['localSlots']().some(
          (s: PinnedNewsSlot) => s.newsId === 'news-2',
        ),
      ).toBe(false);
    });

    it('«Отменить добавление» выходит из режима расстановки без создания слота', () => {
      const fixture = createEditor([newsItem('news-1')], []);

      fixture.componentInstance['pendingNews'].set({ newsId: 'news-1' });
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

    it("обложка слота при размещении — обложка новости (stream.Front#137); менять её можно только через CoverPicker в drawer'е (stream.Front#132), не самим фактом закрепления", () => {
      const fixture = createEditor(
        [
          newsItem('news-1', {
            imageUrls: ['/a.png', '/b.png'],
            cover: { type: 'image', url: '/a.png', focalPoint: null, variants: [] },
          }),
        ],
        [],
      );

      // Слот, построенный редактором при размещении, берёт обложку у новости
      fixture.componentInstance['pendingNews'].set({ newsId: 'news-1' });
      fixture.componentInstance['onPlacementCellPointerDown']({ col: 1, row: 1 });
      window.dispatchEvent(new Event('pointerup'));

      expect(fixture.componentInstance['localSlots']()[0].cover).toEqual({
        type: 'image',
        url: '/a.png',
        focalPoint: null,
        variants: [],
      });
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
            images: [{ id: 'img-1', url: '/a.png', focalX: null, focalY: null, variants: [] }],
            cover: { type: 'image', url: '/a.png', focalPoint: null, variants: [] },
          }),
        ],
        [slot({ newsId: 'news-1' })],
      );
      const adminNewsService = TestBed.inject(AdminNewsService);

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-focal-point-picker')).not.toBeNull();

      fixture.componentInstance['onFocalPointChange']({ x: 20, y: 80 });

      expect(adminNewsService.updateImageFocalPoint).toHaveBeenCalledWith('img-1', {
        focalX: 20,
        focalY: 80,
      });
      expect(fixture.componentInstance['editingFocalPoint']()).toEqual({ x: 20, y: 80 });
    });

    it('ошибка сохранения откатывает точку к ПОСЛЕДНЕЙ известной сохранённой (не к центру), если у картинки уже была точка', () => {
      TestBed.overrideProvider(AdminNewsService, {
        useValue: {
          updateImageFocalPoint: vi.fn().mockReturnValue(throwError(() => new Error('boom'))),
        },
      });
      const fixture = createEditor(
        [
          newsItem('news-1', {
            imageUrls: ['/a.png'],
            images: [{ id: 'img-1', url: '/a.png', focalX: 30, focalY: 40, variants: [] }],
            cover: { type: 'image', url: '/a.png', focalPoint: { x: 30, y: 40 }, variants: [] },
          }),
        ],
        [slot({ newsId: 'news-1' })],
      );

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
      fixture.detectChanges();

      expect(fixture.componentInstance['editingFocalPoint']()).toEqual({ x: 30, y: 40 });

      fixture.componentInstance['onFocalPointChange']({ x: 90, y: 90 });

      expect(fixture.componentInstance['editingFocalPoint']()).toEqual({ x: 30, y: 40 });
    });

    describe("CoverPicker в drawer'е редактирования (stream.Front#132, РЕД-О-02)", () => {
      it('показан вместе с предупреждением, что меняет обложку новости везде', () => {
        const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

        fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('app-cover-picker')).not.toBeNull();
        expect(
          fixture.nativeElement.querySelector('.pinned-grid-editor__cover-warning')?.textContent,
        ).toContain('везде');
      });

      it('получает набор картинок редактируемой новости', () => {
        const fixture = createEditor(
          [newsItem('news-1', { imageUrls: ['/a.png', '/b.png'] })],
          [slot({ newsId: 'news-1' })],
        );

        fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);

        expect(fixture.componentInstance['editingNewsImages']()).toEqual(['/a.png', '/b.png']);
      });

      it('выбор конкретной обложки применяется сразу через AdminNewsService.update(), не по «Сохранить»', () => {
        const fixture = createEditor(
          [
            newsItem('news-1', {
              imageUrls: ['/a.png'],
              cover: { type: 'none', url: null, focalPoint: null, variants: [] },
            }),
          ],
          [slot({ newsId: 'news-1' })],
        );
        const adminNewsService = TestBed.inject(AdminNewsService);

        fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
        fixture.componentInstance['onCoverPickerChange']('news-1', {
          type: 'image',
          url: '/a.png',
        });

        expect(adminNewsService.update).toHaveBeenCalledWith('news-1', {
          cover: { type: 'image', url: '/a.png' },
        });
        expect(fixture.componentInstance['editingCoverValue']()).toEqual({
          type: 'image',
          url: '/a.png',
        });
        // Черновик стиля не тронут — обложка не копится в drawer'е до «Сохранить».
        expect(fixture.componentInstance['draftStyle']()).toEqual(DEFAULT_CARD_STYLE);
      });

      it('тип выбран, но url ещё нет — держит его локально и НЕ отправляет запрос', () => {
        const fixture = createEditor(
          [newsItem('news-1', { imageUrls: ['/a.png'] })],
          [slot({ newsId: 'news-1' })],
        );
        const adminNewsService = TestBed.inject(AdminNewsService);

        fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
        fixture.componentInstance['onCoverPickerChange']('news-1', { type: 'image', url: null });

        expect(adminNewsService.update).not.toHaveBeenCalled();
        expect(fixture.componentInstance['editingCoverValue']()).toEqual({
          type: 'image',
          url: null,
        });
      });

      it('ошибка сохранения откатывает обложку к предыдущей и показывает toast', () => {
        TestBed.overrideProvider(AdminNewsService, {
          useValue: {
            updateImageFocalPoint: vi.fn().mockReturnValue(of({})),
            update: vi.fn().mockReturnValue(throwError(() => new Error('boom'))),
          },
        });
        const fixture = createEditor(
          [
            newsItem('news-1', {
              imageUrls: ['/a.png'],
              cover: { type: 'none', url: null, focalPoint: null, variants: [] },
            }),
          ],
          [slot({ newsId: 'news-1' })],
        );
        const notificationService = TestBed.inject(NotificationService);
        const showSpy = vi.spyOn(notificationService, 'show');

        fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
        fixture.componentInstance['onCoverPickerChange']('news-1', {
          type: 'image',
          url: '/a.png',
        });

        expect(fixture.componentInstance['editingCoverValue']()).toEqual({
          type: 'none',
          url: null,
        });
        expect(showSpy).toHaveBeenCalledWith('Не удалось изменить обложку', 'error');
      });

      it('смена новости в форме редактирования сбрасывает незавершённый выбор типа обложки', () => {
        const fixture = createEditor(
          [newsItem('news-1', { imageUrls: ['/a.png'] }), newsItem('news-2')],
          [slot({ newsId: 'news-1' })],
        );

        fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);
        fixture.componentInstance['onCoverPickerChange']('news-1', { type: 'custom', url: null });
        expect(fixture.componentInstance['editingCoverValue']()).toEqual({
          type: 'custom',
          url: null,
        });

        fixture.componentInstance['onEditFormNewsChange']('news-1', 'news-2');

        expect(fixture.componentInstance['editingCoverValue']()).toEqual({
          type: 'none',
          url: null,
        });
      });
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
    it('переключение раскладки переключает и размер сетки, и позиции карточек', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [newsItem('news-1'), newsItem('news-2')]);
      fixture.componentRef.setInput('layouts', {
        small: { config: { columns: 2, rows: 6 }, slots: [slot({ newsId: 'news-1' })] },
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-2' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      expect(fixture.componentInstance['localGridConfig']()).toEqual(GRID_CONFIG);

      fixture.componentInstance['onViewportChange']('small');

      expect(fixture.componentInstance['localGridConfig']()).toEqual({ columns: 2, rows: 6 });
      const news1Slot = fixture.componentInstance['localSlots']().find(
        (s: PinnedNewsSlot) => s.newsId === 'news-1',
      )!;
      expect(news1Slot.colStart).toBe(1);
      expect(news1Slot.rowStart).toBe(1);
    });

    it('onViewportChange(null) — no-op, игнорирует пустое значение селекта', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      fixture.componentInstance['onViewportChange'](null);

      expect(fixture.componentInstance['viewportPreset']()).toBe('large');
    });

    it('«Сохранить» эмитит РЕАЛЬНОЕ состояние каждой раскладки — новость, размещённая только в large, в small не появляется (РАС-Ф-02)', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);
      const saveSpy = vi.fn();
      fixture.componentInstance.save.subscribe(saveSpy);

      fixture.componentInstance['onSaveClick']();

      const emitted = saveSpy.mock.calls[0][0] as Record<PinnedGridViewport, PinnedGridLayout>;
      expect(emitted.large.slots.map((s: PinnedNewsSlot) => s.newsId)).toEqual(['news-1']);
      expect(emitted.small.slots).toEqual([]);
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

  describe('геометрия холста — два состояния на раскладку, не выбор устройства (РАБ-Ф-01…РАБ-Ф-08, stream.Front#128)', () => {
    it('дефолт — large/reference (эталон Full HD)', () => {
      const fixture = createEditor([], []);

      expect(fixture.componentInstance['viewportPreset']()).toBe('large');
      expect(fixture.componentInstance['density']()).toBe('reference');
      expect(fixture.componentInstance['screenSize']()).toEqual({ width: 1920, height: 1080 });
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({
        width: 1920 - 2 * 60 - 660 - 110,
        height: 1080 - 64 - 2 * 60,
      });
    });

    it('large/tight — на 1px уже потолка «лента ещё сбоку» (NEWS_PAGE_ARCHIVE_BESIDE_MAX_SCREEN_WIDTH_PX + 1), лента всё ещё сбоку', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onDensityChange']('tight');

      expect(fixture.componentInstance['screenSize']()).toEqual({ width: 1201, height: 1080 });
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({
        // 1201 − 120 = 1081 доступно: лента на минимуме 440, зазор эталон 110, витрине 531
        width: 531,
        height: 1080 - 64 - 2 * 60,
      });
    });

    it('small/reference — типичный телефон (375×812), высота не фиксирована', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onViewportChange']('small');

      expect(fixture.componentInstance['screenSize']()).toEqual({ width: 375, height: 812 });
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({
        width: 375 - 2 * 20,
        height: null,
      });
    });

    it('small/tight — минимальная поддерживаемая ширина проекта (320×568)', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onViewportChange']('small');
      fixture.componentInstance['onDensityChange']('tight');

      expect(fixture.componentInstance['screenSize']()).toEqual({ width: 320, height: 568 });
      expect(fixture.componentInstance['gridAreaSize']()).toEqual({
        width: 320 - 2 * 20,
        height: null,
      });
    });

    it('onDensityChange(null) — no-op', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onDensityChange'](null);

      expect(fixture.componentInstance['density']()).toBe('reference');
    });
  });

  describe('строки холста редактора — голый 1fr всегда, точное зеркало PinnedNewsGrid (баг, найденный пользователем: minmax(160px, 1fr) растягивал карточки на small в разы больше реальных)', () => {
    it('на small (высота холста не фиксирована) — тот же голый 1fr, что и на large, без искусственного пола', () => {
      const fixture = createEditor([], []);

      fixture.componentInstance['onViewportChange']('small');

      expect(fixture.componentInstance['gridAreaSize']().height).toBeNull();
      expect(fixture.componentInstance['gridTemplateRows']()).toBe(
        `repeat(${fixture.componentInstance['localGridConfig']().rows}, 1fr)`,
      );
    });

    it('на large (высота холста фиксирована) строки честно делят её — голый 1fr', () => {
      const fixture = createEditor([], []);

      expect(fixture.componentInstance['gridAreaSize']().height).not.toBeNull();
      expect(fixture.componentInstance['gridTemplateRows']()).toBe(
        `repeat(${fixture.componentInstance['localGridConfig']().rows}, 1fr)`,
      );
    });
  });

  describe('образцы кадрирования — реальные формы ячеек, не отвлечённый набор (ФОК-Ф-04, stream.Front#128)', () => {
    it('новость размещена только в large — один образец, форма её ячейки на эталонном экране large', () => {
      const fixture = createEditor(
        [
          newsItem('news-1', {
            imageUrls: ['/a.png'],
            images: [{ id: 'img-1', url: '/a.png', focalX: null, focalY: null, variants: [] }],
            cover: { type: 'image', url: '/a.png', focalPoint: null, variants: [] },
          }),
        ],
        [slot({ newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 })],
      );

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);

      const samples = fixture.componentInstance['editingCropSamples']();
      expect(samples).toHaveLength(1);
      expect(samples[0].label).toBe('Широкая');
    });

    it('новость размещена в обеих раскладках — два образца', () => {
      const fixture = TestBed.createComponent(PinnedGridEditor);
      fixture.componentRef.setInput('news', [
        newsItem('news-1', {
          imageUrls: ['/a.png'],
          images: [{ id: 'img-1', url: '/a.png', focalX: null, focalY: null, variants: [] }],
          cover: { type: 'image', url: '/a.png', focalPoint: null, variants: [] },
        }),
      ]);
      fixture.componentRef.setInput('layouts', {
        small: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
        large: { config: GRID_CONFIG, slots: [slot({ newsId: 'news-1' })] },
      } satisfies Record<PinnedGridViewport, PinnedGridLayout>);
      fixture.detectChanges();

      fixture.componentInstance['onEditStyleClick'](fixture.componentInstance['localSlots']()[0]);

      const samples = fixture.componentInstance['editingCropSamples']();
      expect(samples.map((s: { label: string }) => s.label).sort()).toEqual([
        'Компактная',
        'Широкая',
      ]);
    });

    it('ничего не редактируется — пустой список', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      expect(fixture.componentInstance['editingCropSamples']()).toEqual([]);
    });
  });

  describe('режим подложки виден на холсте (РАБ-Ф-09, РАБ-Ф-10, stream.Front#128)', () => {
    it('карточка без обложки не показывает подсказку подложки', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      expect(fixture.nativeElement.querySelector('.pinned-grid-editor__quilt-hint')).toBeNull();
    });

    it('quiltReasonLabel сопоставляет причину с читаемым текстом', () => {
      const fixture = createEditor([newsItem('news-1')], [slot({ newsId: 'news-1' })]);

      expect(fixture.componentInstance['quiltReasonLabel']('picture')).toContain('картинка');
      expect(fixture.componentInstance['quiltReasonLabel']('text')).toContain('текст');
      expect(fixture.componentInstance['quiltReasonLabel']('both')).toContain('картинка');
    });
  });
});
