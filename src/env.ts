import { z } from 'zod';

/**
 * Environment variable schema for type-safe validation
 * This ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // ============================================
  // SUPABASE - Primary Database
  // ============================================
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // ============================================
  // EMAIL / IMAP
  // ============================================
  IMAP_USER: z.string().email('IMAP_USER must be a valid email'),
  IMAP_PASSWORD: z.string().min(1, 'IMAP_PASSWORD is required'),
  IMAP_HOST: z.string().min(1, 'IMAP_HOST is required'),
  IMAP_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),

  // ============================================
  // AI / LLM
  // ============================================
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),

  // LangFuse (optional - for LLM observability)
  LANGFUSE_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_BASE_URL: z.string().url().optional().default('https://cloud.langfuse.com'),

  // ============================================
  // CRON / WORKERS
  // ============================================
  CRON_SECRET: z
    .string()
    .min(16, 'CRON_SECRET must be at least 16 characters for security'),

  // ============================================
  // NEXT.JS
  // ============================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validated and typed environment variables
 * Use this instead of process.env for type safety
 *
 * @example
 * import { env } from '@/env';
 * const dbUrl = env.DATABASE_URL; // ✅ TypeScript knows this is a string
 */
export const env = envSchema.parse(process.env);

/**
 * Type of the validated environment variables
 * Useful for function parameters
 */
export type Env = z.infer<typeof envSchema>;
