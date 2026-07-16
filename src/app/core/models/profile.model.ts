export interface Profile {
  id: string;
  userId: string;
  email: string | null;
}

export interface UpdateProfileDto {
  email?: string;
}
