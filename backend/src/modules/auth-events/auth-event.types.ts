export type AuthActionEventType =
  | 'auth.email_verification_requested'
  | 'auth.password_reset_requested';

export interface AuthActionEvent {
  id: string;
  type: AuthActionEventType;
  recipient: { email: string; name?: string };
  actionUrl: string;
  expiresAt: string;
  locale?: string;
}
