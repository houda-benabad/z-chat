import { PrismaClient, CallType, CallStatus, EndReason } from "@prisma/client";

const CALLER_USER_SELECT = {
  id: true,
  phone: true,
  name: true,
  avatar: true,
} as const;

export class CallRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    callerId: string;
    calleeId?: string;
    chatId?: string;
    channelName: string;
    type: CallType;
  }) {
    return this.prisma.call.create({
      data: {
        callerId: data.callerId,
        calleeId: data.calleeId,
        chatId: data.chatId,
        channelName: data.channelName,
        type: data.type,
        status: CallStatus.RINGING,
      },
      include: {
        caller: { select: CALLER_USER_SELECT },
        callee: { select: CALLER_USER_SELECT },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.call.findUnique({
      where: { id },
      include: {
        caller: { select: CALLER_USER_SELECT },
        callee: { select: CALLER_USER_SELECT },
      },
    });
  }

  async findByChannelName(channelName: string) {
    return this.prisma.call.findFirst({
      where: { channelName, status: { in: [CallStatus.RINGING, CallStatus.ONGOING] } },
      include: {
        caller: { select: CALLER_USER_SELECT },
        callee: { select: CALLER_USER_SELECT },
      },
    });
  }

  async updateStatus(id: string, status: CallStatus, extra?: {
    answeredAt?: Date;
    endedAt?: Date;
    duration?: number;
    endReason?: EndReason;
  }) {
    return this.prisma.call.update({
      where: { id },
      data: { status, ...extra },
      include: {
        caller: { select: CALLER_USER_SELECT },
        callee: { select: CALLER_USER_SELECT },
      },
    });
  }

  async getCallHistory(userId: string, cursor?: string, limit = 25) {
    const where = {
      OR: [{ callerId: userId }, { calleeId: userId }],
      status: { not: CallStatus.RINGING },
    };

    const calls = await this.prisma.call.findMany({
      where: cursor
        ? { ...where, startedAt: { lt: new Date(cursor) } }
        : where,
      orderBy: { startedAt: "desc" as const },
      take: limit + 1,
      include: {
        caller: { select: CALLER_USER_SELECT },
        callee: { select: CALLER_USER_SELECT },
      },
    });

    const hasMore = calls.length > limit;
    if (hasMore) calls.pop();

    return {
      calls,
      hasMore,
      nextCursor: hasMore ? calls[calls.length - 1].startedAt.toISOString() : null,
    };
  }
}
