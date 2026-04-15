import { CallType, CallStatus, EndReason } from "@prisma/client";
import { CallRepository } from "./repository";
import { AppError } from "../../shared/utils/errors";
import { RtcTokenBuilder, RtcRole } from "agora-token";

export class CallService {
  constructor(private repo: CallRepository) {}

  generateAgoraToken(channelName: string, uid: number): string {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      // Return empty token when Agora not configured — call UI still works, no media
      return "";
    }

    const expireTimeSec = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTimeSec;

    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
      privilegeExpiredTs,
    );
  }

  async initiateCall(callerId: string, calleeId: string, chatId: string | undefined, type: CallType) {
    if (callerId === calleeId) {
      throw new AppError(400, "Cannot call yourself", "INVALID_CALLEE");
    }

    const channelName = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const call = await this.repo.create({
      callerId,
      calleeId,
      chatId,
      channelName,
      type,
    });

    return call;
  }

  async initiateGroupCall(callerId: string, chatId: string, type: CallType) {
    const channelName = `group_${chatId}_${Date.now()}`;

    const call = await this.repo.create({
      callerId,
      chatId,
      channelName,
      type,
    });

    return call;
  }

  async acceptCall(callId: string) {
    const call = await this.repo.findById(callId);
    if (!call) throw new AppError(404, "Call not found", "CALL_NOT_FOUND");
    if (call.status !== CallStatus.RINGING) {
      throw new AppError(400, "Call is not ringing", "CALL_NOT_RINGING");
    }

    return this.repo.updateStatus(callId, CallStatus.ONGOING, {
      answeredAt: new Date(),
    });
  }

  async endCall(callId: string, endReason: EndReason) {
    const call = await this.repo.findById(callId);
    if (!call) throw new AppError(404, "Call not found", "CALL_NOT_FOUND");

    const endedAt = new Date();
    let duration: number | undefined;
    if (call.answeredAt) {
      duration = Math.round((endedAt.getTime() - call.answeredAt.getTime()) / 1000);
    }

    return this.repo.updateStatus(callId, CallStatus.ENDED, {
      endedAt,
      duration,
      endReason,
    });
  }

  async rejectCall(callId: string) {
    const call = await this.repo.findById(callId);
    if (!call) throw new AppError(404, "Call not found", "CALL_NOT_FOUND");

    return this.repo.updateStatus(callId, CallStatus.REJECTED, {
      endedAt: new Date(),
    });
  }

  async missCall(callId: string) {
    const call = await this.repo.findById(callId);
    if (!call) throw new AppError(404, "Call not found", "CALL_NOT_FOUND");
    if (call.status !== CallStatus.RINGING) return call;

    return this.repo.updateStatus(callId, CallStatus.MISSED, {
      endedAt: new Date(),
    });
  }

  async busyCall(callId: string) {
    const call = await this.repo.findById(callId);
    if (!call) throw new AppError(404, "Call not found", "CALL_NOT_FOUND");

    return this.repo.updateStatus(callId, CallStatus.BUSY, {
      endedAt: new Date(),
    });
  }

  async getCallHistory(userId: string, cursor?: string, limit?: number) {
    return this.repo.getCallHistory(userId, cursor, limit);
  }
}
