import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Форсит withCredentials: true на всех HTTP-запросах приложения, чтобы
 * httpOnly auth-cookie уходила с каждым запросом к backend (stream.Front#14).
 */
export const withCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
