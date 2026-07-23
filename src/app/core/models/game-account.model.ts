export interface GameAccount {
  id: string;
  userId: string;
  nickname: string;
  externalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameAccountDto {
  nickname: string;
  externalId: string;
}

export interface UpdateGameAccountDto {
  nickname?: string;
  externalId?: string;
}
