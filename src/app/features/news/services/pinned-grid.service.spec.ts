import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { DEFAULT_CARD_STYLE, PinnedGridLayout } from '../models/pinned-news-slot.model';
import { PinnedGridService } from './pinned-grid.service';

const mockLayout: PinnedGridLayout = {
  config: { columns: 3, rows: 12 },
  slots: [
    { newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 7, style: DEFAULT_CARD_STYLE, cover: { type: 'none', url: null, focalPoint: null } },
  ],
};

describe('PinnedGridService', () => {
  let service: PinnedGridService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PinnedGridService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getLayout() бьёт в GET /news/pinned-layout/:viewport', () => {
    let result: PinnedGridLayout | undefined;
    service.getLayout('large').subscribe((layout) => (result = layout));

    const req = httpMock.expectOne(`${environment.apiUrl}/news/pinned-layout/large`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLayout);

    expect(result).toEqual(mockLayout);
  });

  it('updateLayout() бьёт в PUT /admin/news/pinned-layout/:viewport с телом-раскладкой', () => {
    let result: PinnedGridLayout | undefined;
    service.updateLayout('small', mockLayout).subscribe((layout) => (result = layout));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/news/pinned-layout/small`);
    expect(req.request.method).toBe('PUT');
    // Обложка и фокус принадлежат новости, сервер их здесь не принимает
    // (stream.Front#137): лишнее поле дало бы 400, а не было бы проигнорировано
    expect(req.request.body).toEqual({
      config: mockLayout.config,
      slots: [
        { newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 7, style: DEFAULT_CARD_STYLE },
      ],
    });
    expect(req.request.body.slots[0].cover).toBeUndefined();
    req.flush(mockLayout);

    expect(result).toEqual(mockLayout);
  });
});
