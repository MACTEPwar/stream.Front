import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateSocialLinkDto, SocialLink, UpdateSocialLinkDto } from '../models/social-link.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SocialLinkService {
  private readonly api = inject(ApiService);

  getAll(): Observable<SocialLink[]> {
    return this.api.get<SocialLink[]>('/profile/social-links');
  }

  create(dto: CreateSocialLinkDto): Observable<SocialLink> {
    return this.api.post<SocialLink>('/profile/social-links', dto);
  }

  update(id: string, dto: UpdateSocialLinkDto): Observable<SocialLink> {
    return this.api.patch<SocialLink>(`/profile/social-links/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/profile/social-links/${id}`);
  }
}
