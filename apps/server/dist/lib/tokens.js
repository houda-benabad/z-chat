"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.generateOtp = generateOtp;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
function signAccessToken(payload, secret) {
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "15m" });
}
function signRefreshToken(payload, secret) {
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "7d" });
}
function verifyAccessToken(token, secret) {
    return jsonwebtoken_1.default.verify(token, secret);
}
function verifyRefreshToken(token, secret) {
    return jsonwebtoken_1.default.verify(token, secret);
}
function generateOtp() {
    return crypto_1.default.randomInt(100000, 999999).toString();
}
//# sourceMappingURL=tokens.js.map