import type { IOAuthAdapter, OAuthTokens, OAuthUserInfo } from './types.js'

export class GoogleOAuthAdapter implements IOAuthAdapter {
  provider = 'google'

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async exchangeCode(code: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(`Google OAuth error: ${tokenData.error_description}`)
    }

    const accessToken = tokenData.access_token as string
    const refreshToken = tokenData.refresh_token as string | undefined
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()

    return {
      tokens: { accessToken, refreshToken, expiresAt, scopes: 'openid email profile' },
      userInfo: {
        provider: 'google',
        providerUserId: userData.id,
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture,
      },
    }
  }
}
