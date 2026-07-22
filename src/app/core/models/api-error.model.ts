import { HttpErrorResponse } from '@angular/common/http';

/** Форма тела ошибки бэкенда (backend/src/shared/dto/error-response.dto.ts). */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

/**
 * Nest ValidationPipe кладёт в `message` массив строк, когда проваливается
 * сразу несколько правил валидации DTO (например MinLength сразу у пароля
 * и логина) — обычную ошибку с одной строкой возвращает как есть. Приводим
 * оба варианта к одному тексту; `null`, если тело ошибки не в этом формате
 * (сетевой сбой, HTML-страница 500 и т.п. — тогда показывать общий фолбэк).
 */
export function extractApiErrorMessage(error: HttpErrorResponse): string | null {
  const body = error.error as Partial<ApiErrorBody> | null;
  if (!body?.message) return null;
  return Array.isArray(body.message) ? body.message.join(', ') : body.message;
}
