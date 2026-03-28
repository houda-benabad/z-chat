import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface AccessTokenPayload {
  sub: string;
  phone: string;
}

export function signAccessToken(payload: AccessTokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: "15m" });
}

export function signRefreshToken(payload: { sub: string }, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string, secret: string): { sub: string } {
  return jwt.verify(token, secret) as { sub: string };
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}
