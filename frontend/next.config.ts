// frontend/next.config.ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

const nextConfig: NextConfig = {
  output: 'standalone',  // required for the Docker multi-stage runner
}

export default withNextIntl(nextConfig)
