import type { AgentStreamRequest } from "@/lib/nexus-types";
import { blockLegacyToolRouteInProduction } from "@/lib/backend/security/legacy-tool-route-boundary";
import {
  getModelOption,
  getProviderIdForModel,
  getProviderOption,
} from "@/lib/nexus-registry";
import {
  OpenAICompatibleAdapter,
  getCompatibleBaseUrl,
  getRuntimeString,
} from "@/lib/backend/runtime/provider-adapter";

type ProviderVerifyRequest = {
  providerId?: string;
  model?: string;
  baseUrl?: string;
};

const DEFAULT_VERIFY_MODEL = "gpt-4o-mini";

function getBearerToken(header: string | null) {
  if (!header) {
    return "";
  }

  const [scheme, token] = header.split(/\s+/, 2);

  return scheme?.toLowerCase() === "bearer" ? getRuntimeString(token) : "";
}

export async function POST(request: Request) {
  const blocked = blockLegacyToolRouteInProduction();

  if (blocked) {
    return blocked;
  }

  let payload: ProviderVerifyRequest = {};

  try {
    payload = (await request.json()) as ProviderVerifyRequest;
  } catch {
    payload = {};
  }

  const apiKey = getBearerToken(request.headers.get("authorization"));

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        error: "Provider API key is missing.",
        verified: false,
      },
      { status: 400 },
    );
  }

  const requestedProviderId = getRuntimeString(payload.providerId);
  const model =
    getRuntimeString(payload.model) ||
    (requestedProviderId === "deepseek" ? "deepseek-v4-pro" : DEFAULT_VERIFY_MODEL);
  const providerId = requestedProviderId || getProviderIdForModel(model);
  const provider = getProviderOption(providerId);
  const modelOption = getModelOption(model);

  if (!provider || !modelOption) {
    return Response.json(
      {
        ok: false,
        error: "Provider or model is not registered.",
        verified: false,
      },
      { status: 400 },
    );
  }

  if (getProviderIdForModel(model) !== providerId) {
    return Response.json(
      {
        ok: false,
        error: "Model does not belong to the requested provider.",
        verified: false,
      },
      { status: 400 },
    );
  }

  if (provider.adapter !== "openai-compatible") {
    return Response.json(
      {
        ok: false,
        error: "Provider does not expose a live verification adapter.",
        verified: false,
      },
      { status: 400 },
    );
  }

  const baseUrl = getCompatibleBaseUrl(
    payload.baseUrl || request.headers.get("x-nexus-base-url"),
    provider.defaultBaseUrl,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const adapter = new OpenAICompatibleAdapter();
  const verifyPayload: AgentStreamRequest = {
    agent: {
      callsign: "VERIFY",
      contextNotes: [],
      identity: "provider verification probe",
      memory: [],
      mission: "Verify live connectivity with the configured provider.",
      executionPrompt: "",
      model,
      provider: providerId,
      title: "Provider Verification",
    },
    messages: [
      {
        content: "Reply with OK.",
        role: "user",
      },
    ],
    model,
  };

  try {
    const stream = await adapter.createChatStream({
      allowMockFallback: false,
      apiKey,
      baseUrl,
      model,
      payload: verifyPayload,
      provider: providerId,
      signal: controller.signal,
    });
    let receivedSignal = false;

    for await (const chunk of stream.stream) {
      if (chunk.delta) {
        receivedSignal = true;
        break;
      }
    }

    return Response.json({
      ok: receivedSignal,
      checkedAt: new Date().toISOString(),
      model: stream.model,
      provider: stream.provider,
      verified: receivedSignal,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Provider verification failed.",
        verified: false,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
