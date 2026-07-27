export interface Profile {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface UpdateProfileDto {
  name?: string;
}

export interface UpdateAvatarDto {
  avatarUrl: string;
}
