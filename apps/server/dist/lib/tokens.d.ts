export interface AccessTokenPayload {
    sub: string;
    phone: string;
}
export declare function signAccessToken(payload: AccessTokenPayload, secret: string): string;
export declare function signRefreshToken(payload: {
    sub: string;
}, secret: string): string;
export declare function verifyAccessToken(token: string, secret: string): AccessTokenPayload;
export declare function verifyRefreshToken(token: string, secret: string): {
    sub: string;
};
export declare function generateOtp(): string;
//# sourceMappingURL=tokens.d.ts.map