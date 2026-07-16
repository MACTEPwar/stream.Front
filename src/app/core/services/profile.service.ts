import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Profile, UpdateProfileDto } from '../models/profile.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);

  getProfile(): Observable<Profile> {
    return this.api.get<Profile>('/profile');
  }

  updateProfile(dto: UpdateProfileDto): Observable<Profile> {
    return this.api.patch<Profile>('/profile', dto);
  }
}
