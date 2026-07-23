import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateGameAccountDto, GameAccount, UpdateGameAccountDto } from '../models/game-account.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class GameAccountService {
  private readonly api = inject(ApiService);

  getAll(): Observable<GameAccount[]> {
    return this.api.get<GameAccount[]>('/profile/game-accounts');
  }

  create(dto: CreateGameAccountDto): Observable<GameAccount> {
    return this.api.post<GameAccount>('/profile/game-accounts', dto);
  }

  update(id: string, dto: UpdateGameAccountDto): Observable<GameAccount> {
    return this.api.patch<GameAccount>(`/profile/game-accounts/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/profile/game-accounts/${id}`);
  }
}
