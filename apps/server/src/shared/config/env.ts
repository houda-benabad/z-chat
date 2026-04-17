import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(3000),
  ALLOWED_ORIGIN: z.string().default("http://localhost:8081"),
  UPLOAD_BASE_URL: z.string().url().default("http://localhost:3000"),
  SENTRY_DSN: z.string().url().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  GLOBAL_RATE_LIMIT: z.coerce.number().default(1000),
  GLOBAL_RATE_WINDOW: z.coerce.number().default(60),
  OTP_RATE_LIMIT: z.coerce.number().default(5),
  OTP_RATE_WINDOW: z.coerce.number().default(900),
  VERIFY_RATE_LIMIT: z.coerce.number().default(10),
  VERIFY_RATE_WINDOW: z.coerce.number().default(900),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
