import type { ApiEnvelope } from "../contracts/api-envelope";

export async function unwrapApiEnvelopeResponse<T>(
  response: Response,
): Promise<Response> {
  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (envelope.ok) {
    return Response.json(envelope.data, {
      status: response.status,
    });
  }

  return Response.json(
    {
      error: envelope.error.message,
      code: envelope.error.code,
    },
    {
      status: response.status,
    },
  );
}
