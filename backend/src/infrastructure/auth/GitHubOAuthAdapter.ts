import type { IOAuthAdapter, OAuthTokens, OAuthUserInfo } from './types.js'

export class GitHubOAuthAdapter implements IOAuthAdapter {
  provider = 'github'

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'read:user user:email',
      state,
    })
    return `https://github.com/login/oauth/authorize?${params}`
  }

  async exchangeCode(code: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: this.clientId, client_secret: this.clientSecret, code }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description}`)
    }

    const accessToken = tokenData.access_token as string
    const scopes = tokenData.scope as string

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
    })
    const userData = await userRes.json()

    let email = userData.email
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
      })
      const emails = await emailsRes.json()
      email = emails.find((e: any) => e.primary && e.verified)?.email ?? emails[0]?.email
    }

    return {
      tokens: { accessToken, scopes },
      userInfo: {
        provider: 'github',
        providerUserId: String(userData.id),
        email: email ?? '',
        name: userData.name ?? userData.login,
        avatarUrl: userData.avatar_url,
      },
    }
  }
}
