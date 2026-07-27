export type AuthMethodType = 'LOCAL' | 'GOOGLE';

export interface AuthMethod {
  type: AuthMethodType;
  identifier: string;
}

export interface AuthMethodSummary {
  type: AuthMethodType;
}

export const AUTH_METHOD_TYPE_LABELS: Record<AuthMethodType, string> = {
  LOCAL: 'Локальный вход',
  GOOGLE: 'Google',
};
