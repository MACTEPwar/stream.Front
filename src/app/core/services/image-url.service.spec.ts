import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { ImageUrlService } from './image-url.service';

describe('ImageUrlService', () => {
  let service: ImageUrlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageUrlService);
  });

  it('строит полный URL из /uploads/*-пути и environment.apiUrl', () => {
    expect(service.resolve('/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png')).toBe(
      `${environment.apiUrl}/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png`,
    );
  });

  it('не трогает пресеты (/images/*) — они уже лежат на фронте', () => {
    expect(service.resolve('/images/avatar-presets/preset-1.svg')).toBe(
      '/images/avatar-presets/preset-1.svg',
    );
  });

  it('не трогает уже абсолютные http(s)://-урлы', () => {
    expect(service.resolve('https://example.com/avatar.png')).toBe(
      'https://example.com/avatar.png',
    );
    expect(service.resolve('http://example.com/avatar.png')).toBe(
      'http://example.com/avatar.png',
    );
  });
});
