import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { AppProviders } from "@/components/providers/AppProviders"

const locales = ["pt-BR", "en-US"]

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  if (!locales.includes(locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()
  const defaultTheme = process.env.UI_DEFAULT_THEME ?? "dark"

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme={defaultTheme}>
          <NextIntlClientProvider messages={messages}>
            <AppProviders>
              {children}
            </AppProviders>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
