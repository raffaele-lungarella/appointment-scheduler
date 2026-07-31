import { env } from "$env/dynamic/private";
import { CleanupService } from "$lib/server/services/clean-up.service";
import { json, type RequestHandler } from "@sveltejs/kit";

function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

export function _isAuthorizedCronRequest(request: Request, secret: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  return constantTimeEqual(authorization.slice("Bearer ".length), secret);
}

export const GET: RequestHandler = async ({ request }) => {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return json({ success: false, error: "cron_not_configured" }, { status: 503 });
  }

  if (!_isAuthorizedCronRequest(request, secret)) {
    return json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await CleanupService.get().deleteExpiredItems();
  return json(result, { status: result.success ? 200 : 500 });
};
