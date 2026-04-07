import { PrismaClient } from "@prisma/client";

export class AuthRepository {
  constructor(private prisma: PrismaClient) {}

  async findUserByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async createUser(phone: string) {
    return this.prisma.user.create({ data: { phone } });
  }

  async createRefreshToken(data: { token: string; userId: string; expiresAt: Date }) {
    return this.prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async findRefreshTokenOnly(token: string) {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async revokeRefreshToken(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpiredAndRevokedTokens() {
    const now = new Date();
    return this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { not: null } },
        ],
      },
    });
  }
}
