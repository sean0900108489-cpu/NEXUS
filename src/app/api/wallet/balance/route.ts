import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { createWalletRepository } from "@/lib/backend/models/wallet-repository";

export const runtime = "nodejs";

/**
 * GET /api/wallet/balance
 *
 * Returns the authenticated user's current wallet balance.
 * Balance is derived from SUM(wallet_transactions.amount).
 */
export async function GET(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const walletRepo = createWalletRepository();
    const balance = await walletRepo.getBalance(userId);

    return Response.json({
      credits: balance.currentBalance,
      state: balance.currentBalance > 0 ? "ready" : balance.currentBalance > -1 ? "empty" : "low",
      lastTransactionId: balance.lastTransactionId,
      updatedAt: balance.updatedAt,
    });
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}
