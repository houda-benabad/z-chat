import { z } from "zod";
declare const envSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodString;
    JWT_SECRET: z.ZodString;
    JWT_REFRESH_SECRET: z.ZodString;
    PORT: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    REDIS_URL: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    PORT: number;
}, {
    REDIS_URL: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    PORT?: number | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
export declare function loadEnv(): Env;
export {};
//# sourceMappingURL=env.d.ts.map