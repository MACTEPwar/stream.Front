export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER';

export interface CurrentUser {
  id: string;
  login: string;
  role: UserRole;
  email: string | null;
  // Ожидается от backend GET /auth/me (streamer.API#56), на момент stream.Front#64
  // PR ещё не смержен — поля уже часть контракта, populate'ятся тем же
  // AuthService.fetchCurrentUser() без правок сервиса.
  name: string | null;
  avatarUrl: string | null;
}
