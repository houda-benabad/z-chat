import { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    userId?: string;
    userPhone?: string;
}
export declare function authMiddleware(jwtSecret: string): (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map