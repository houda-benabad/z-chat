import { Request, Response, NextFunction, RequestHandler } from "express";
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function asyncHandler(fn: AsyncHandler): RequestHandler;
export {};
//# sourceMappingURL=asyncHandler.d.ts.map