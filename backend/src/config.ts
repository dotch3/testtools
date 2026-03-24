import { z } from 'zod'

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_URL: z.string().url().optional(),
  SHADOW_DATABASE_URL: z.string().url().optional().or(z.literal('')),
  REDIS_URL: z.string().min(1),
  AUTH_MODE: z.enum(['local', 'oauth', 'both']).default('both'),
  ALLOW_REGISTRATION: z.coerce.boolean().default(false),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  ENCRYPTION_KEY: z.string().length(64),
  OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_ID: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  STORAGE_PROVIDER: z.enum(['local', 'supabase', 's3']).default('local'),
  STORAGE_PATH: z.string().default('/data/uploads'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('teststool-uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().default('teststool-uploads'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  BACKUP_PATH: z.string().default('/data/backups'),
  BACKUP_CRON: z.string().default('0 2 * * *'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_OUTPUT: z.enum(['file', 'stdout', 'both']).default('both'),
  LOG_MAX_SIZE: z.string().default('20m'),
  LOG_MAX_FILES: z.string().default('14d'),
  LOG_PATH: z.string().default('/logs'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001/api/v1'),
  UI_DEFAULT_THEME: z.enum(['dark', 'light', 'system']).default('dark'),
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(6).default(8),
  PASSWORD_REQUIRE_UPPERCASE: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_SYMBOL: z.coerce.boolean().default(true),
  LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  LOCKOUT_DURATION_MINUTES: z.coerce.number().int().min(1).default(15),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('teststool <no-reply@company.com>'),
})

export type Config = z.infer<typeof configSchema>

export function validateConfig(env: NodeJS.ProcessEnv): Config {
  const result = configSchema.safeParse(env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return result.data
}

export const config: Config = validateConfig(process.env)
