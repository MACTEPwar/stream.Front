import { Injectable } from '@angular/core';

import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ImageUrlService {
  resolve(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}
