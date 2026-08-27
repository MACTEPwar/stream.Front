import { AuthMethodSummary } from './auth-method.model';

export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER';

/**
 * Слово интерфейса для каждой роли (`stream.Front#131`, `СПС-Ф-02`) — единое
 * место, откуда его берут и бейдж в списке пользователей, и оба селекта
 * (отбор и смена роли); по образцу `AUTH_METHOD_TYPE_LABELS`
 * (`auth-method.model.ts`). До этого в интерфейс протекало сырое значение
 * модели — `USER`/`ADMIN` латиницей посреди русскоязычного экрана.
 *
 * `MODERATOR` здесь есть намеренно, хотя роль зарезервирована и не
 * назначается (`АВТ-О-05`): `УПР-О-03` запрещает ПРЕДЛАГАТЬ её, а не
 * показывать. Если запись с этой ролью встретится, список обязан вывести её
 * так же читаемо, а не латиницей.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  MODERATOR: 'Модератор',
  USER: 'Пользователь',
};

/**
 * `login`/`email` убраны (`stream.Front#82`, поверх `streamer.API#63`) —
 * способы входа теперь отдельный справочник (`AuthMethod`), `email` живёт
 * только как `SocialLink(type=EMAIL)`. `name` — отображаемое имя
 * (`Profile.name`), при регистрации заполняется введённым логином, при входе
 * через Google — именем из Google.
 */
export interface CurrentUser {
  id: string;
  role: UserRole;
  name: string | null;
  avatarUrl: string | null;
  authMethods: AuthMethodSummary[];
}
