export type SocialLinkType = 'EMAIL' | 'TELEGRAM' | 'TIKTOK' | 'PHONE' | 'VIBER';

export const SOCIAL_LINK_TYPE_LABELS: Record<SocialLinkType, string> = {
  EMAIL: 'Email',
  TELEGRAM: 'Telegram',
  TIKTOK: 'TikTok',
  PHONE: 'Телефон',
  VIBER: 'Viber',
};

export interface SocialLink {
  id: string;
  userId: string;
  type: SocialLinkType;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSocialLinkDto {
  type: SocialLinkType;
  value: string;
}

export interface UpdateSocialLinkDto {
  type?: SocialLinkType;
  value?: string;
}
