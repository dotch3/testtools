import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['pt-BR', 'en-US'],
  defaultLocale: 'pt-BR',
  localePrefix: 'never',
})

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
