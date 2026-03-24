import type { IOAuthAdapter, OAuthTokens, OAuthUserInfo } from './types.js'

export class MicrosoftOAuthAdapter implements IOAuthAdapter {
  provider = 'microsoft'

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
    private readonly tenantId?: string,
  ) {}

  getAuthorizationUrl(state: string): string {
    const tenant = this.tenantId ?? 'common'
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'openid email profile',
      state,
    })
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`
  }

  async exchangeCode(code: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    const tenant = this.tenantId ?? 'common'
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
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
      throw new Error(`Microsoft OAuth error: ${tokenData.error_description}`)
    }

    const accessToken = tokenData.access_token as string
    const refreshToken = tokenData.refresh_token as string | undefined
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()

    return {
      tokens: { accessToken, refreshToken, expiresAt, scopes: 'openid email profile' },
      userInfo: {
        provider: 'microsoft',
        providerUserId: userData.id,
        email: userData.mail ?? userData.userPrincipalName,
        name: userData.displayName,
      },
    }
  }
}
