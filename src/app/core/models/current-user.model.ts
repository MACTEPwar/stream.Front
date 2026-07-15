export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER';

export interface CurrentUser {
  id: string;
  login: string;
  role: UserRole;
  email: string | null;
}
