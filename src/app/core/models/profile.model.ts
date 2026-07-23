export interface Profile {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface UpdateProfileDto {
  email?: string;
  name?: string;
}

export interface UpdateAvatarDto {
  avatarUrl: string;
}
