import { AuthMethodSummary } from './auth-method.model';

export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER';

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
