import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { Donator, DonatorsService } from './donators.service';

const mockDonators: Donator[] = [
  { nickname: 'Лексик.З', amount: 79816 },
  { nickname: '-=AnGeL=-', amount: 18850 },
];

describe('DonatorsService', () => {
  let service: DonatorsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DonatorsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getTop() бьёт в GET /donators/top', () => {
    let result: Donator[] | undefined;
    service.getTop().subscribe((donators) => (result = donators));

    const req = httpMock.expectOne(`${environment.apiUrl}/donators/top`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDonators);

    expect(result).toEqual(mockDonators);
  });
});
