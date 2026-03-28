import { Router } from "express";
import { PrismaClient } from "@prisma/client";
export declare function createAuthRouter(prisma: PrismaClient, jwtSecret: string, jwtRefreshSecret: string): Router;
//# sourceMappingURL=auth.d.ts.map