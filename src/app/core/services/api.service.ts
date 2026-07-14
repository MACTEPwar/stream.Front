import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '@env/environment';

type ApiParams = Record<string, string | number | boolean>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: ApiParams): Observable<T> {
    return this.request<T>('GET', path, { params });
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('POST', path, { body });
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('PUT', path, { body });
  }

  delete<T>(path: string, params?: ApiParams): Observable<T> {
    return this.request<T>('DELETE', path, { params });
  }

  private request<T>(
    method: string,
    path: string,
    options: { body?: unknown; params?: ApiParams },
  ): Observable<T> {
    const url = `${environment.apiUrl}${path}`;
    return this.http
      .request<T>(method, url, {
        body: options.body,
        params: options.params && new HttpParams({ fromObject: options.params }),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.status === 0) {
      console.error('Сеть недоступна — не удалось связаться с сервером', error);
    }
    return throwError(() => error);
  }
}
