import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { DEFAULT_CARD_STYLE, PinnedGridLayout } from '../models/pinned-news-slot.model';
import { PinnedGridService } from './pinned-grid.service';

const mockLayout: PinnedGridLayout = {
  config: { columns: 3, rows: 12 },
  slots: [
    { newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 7, style: DEFAULT_CARD_STYLE, coverImageUrl: null, focalPoint: null },
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
    expect(req.request.body).toEqual(mockLayout);
    req.flush(mockLayout);

    expect(result).toEqual(mockLayout);
  });
});
