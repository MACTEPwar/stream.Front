export type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface Settings {
  id: string;
  userId: string;
  theme: Theme;
  receiveNotifications: boolean;
}

export interface UpdateSettingsDto {
  theme?: Theme;
  receiveNotifications?: boolean;
}
