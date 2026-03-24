import type { IOAuthAdapter } from './types.js'
import { GitHubOAuthAdapter } from './GitHubOAuthAdapter.js'
import { GoogleOAuthAdapter } from './GoogleOAuthAdapter.js'
import { MicrosoftOAuthAdapter } from './MicrosoftOAuthAdapter.js'
import { config } from '../../config.js'

const REDIRECT_URI = `${config.FRONTEND_URL}/auth/callback`

export function createOAuthAdapter(provider: string): IOAuthAdapter {
  switch (provider) {
    case 'github':
      if (!config.OAUTH_GITHUB_CLIENT_ID || !config.OAUTH_GITHUB_CLIENT_SECRET) {
        throw new Error('OAUTH_GITHUB_CLIENT_ID and OAUTH_GITHUB_CLIENT_SECRET are required for GitHub OAuth')
      }
      return new GitHubOAuthAdapter(config.OAUTH_GITHUB_CLIENT_ID, config.OAUTH_GITHUB_CLIENT_SECRET, REDIRECT_URI)

    case 'google':
      if (!config.OAUTH_GOOGLE_CLIENT_ID || !config.OAUTH_GOOGLE_CLIENT_SECRET) {
        throw new Error('OAUTH_GOOGLE_CLIENT_ID and OAUTH_GOOGLE_CLIENT_SECRET are required for Google OAuth')
      }
      return new GoogleOAuthAdapter(config.OAUTH_GOOGLE_CLIENT_ID, config.OAUTH_GOOGLE_CLIENT_SECRET, REDIRECT_URI)

    case 'microsoft':
      if (!config.OAUTH_MICROSOFT_CLIENT_ID || !config.OAUTH_MICROSOFT_CLIENT_SECRET) {
        throw new Error('OAUTH_MICROSOFT_CLIENT_ID and OAUTH_MICROSOFT_CLIENT_SECRET are required for Microsoft OAuth')
      }
      return new MicrosoftOAuthAdapter(config.OAUTH_MICROSOFT_CLIENT_ID, config.OAUTH_MICROSOFT_CLIENT_SECRET, REDIRECT_URI)

    default:
      throw new Error(`Unknown OAuth provider: ${provider}. Supported: github, google, microsoft`)
  }
}
