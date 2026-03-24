export interface OAuthUserInfo {
  provider: string
  providerUserId: string
  email: string
  name?: string
  avatarUrl?: string
}

export interface IOAuthAdapter {
  provider: string
  getAuthorizationUrl(state: string): string
  exchangeCode(code: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }>
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scopes: string
}
