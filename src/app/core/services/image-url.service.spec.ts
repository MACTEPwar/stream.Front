import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { ImageUrlService } from './image-url.service';

describe('ImageUrlService', () => {
  let service: ImageUrlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageUrlService);
  });

  it('строит полный URL из относительного пути и environment.apiUrl', () => {
    expect(service.resolve('/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png')).toBe(
      `${environment.apiUrl}/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png`,
    );
  });
});
