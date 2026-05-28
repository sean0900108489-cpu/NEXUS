import { afterEach, describe, expect, it } from "vitest";

import {
  GET as getPrompts,
  resetPromptRouteDependenciesForTests,
  setPromptRouteDependenciesForTests,
} from "@/app/api/v1/prompts/route";

import { InMemoryPromptRepository } from "./prompt-repository";
import { PromptService } from "./prompt-service";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

afterEach(() => {
  resetPromptRouteDependenciesForTests();
});

describe("prompt fetch route", () => {
  it("rejects prompt fetch when only X-User-Id is provided", async () => {
    const response = await getPrompts(
      new Request("http://localhost/api/v1/prompts?workspaceId=workspace-prompt-a", {
        headers: {
          "X-User-Id": "spoofed-owner",
        },
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(401);
    expect(json).toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
      },
      ok: false,
    });
  });

  it("returns visible prompts for the verified session boundary", async () => {
    const repository = new InMemoryPromptRepository();
    await repository.upsert({
      content: "visible prompt body",
      id: "prompt-visible",
      title: "Visible",
      updatedAt: "2026-05-28T01:00:00.000Z",
      workspaceId: "workspace-prompt-a",
    });
    await repository.upsert({
      content: "other prompt body",
      id: "prompt-other",
      title: "Other",
      updatedAt: "2026-05-28T01:01:00.000Z",
      workspaceId: "workspace-prompt-b",
    });
    await repository.upsert({
      content: "deleted prompt body",
      id: "prompt-deleted",
      title: "Deleted",
      updatedAt: "2026-05-28T01:02:00.000Z",
      workspaceId: "workspace-prompt-a",
    });
    await repository.deleteById({
      deletedAt: "2026-05-28T01:03:00.000Z",
      deletedBy: "route-user",
      id: "prompt-deleted",
      workspaceId: "workspace-prompt-a",
    });

    setPromptRouteDependenciesForTests({
      authVerifier: {
        async verifyRequest(request) {
          expect(request.headers.get("authorization")).toBe("Bearer prompts-token");

          return {
            email: "route@example.test",
            id: "route-user",
          };
        },
      },
      service: new PromptService({ repository }),
    });

    const response = await getPrompts(
      new Request(
        "http://localhost/api/v1/prompts?workspaceId=workspace-prompt-a",
        {
          headers: {
            Authorization: "Bearer prompts-token",
            "X-User-Id": "spoofed-owner",
          },
        },
      ),
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        source: "prompt_service",
        workspaceId: "workspace-prompt-a",
      },
      ok: true,
    });
    expect((json.data as { prompts: Array<{ id: string }> }).prompts).toEqual([
      expect.objectContaining({ id: "prompt-visible" }),
    ]);
  });
});
