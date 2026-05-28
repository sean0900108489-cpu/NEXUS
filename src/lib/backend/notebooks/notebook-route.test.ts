import { afterEach, describe, expect, it } from "vitest";

import {
  GET as getNotebooks,
  resetNotebookRouteDependenciesForTests,
  setNotebookRouteDependenciesForTests,
} from "@/app/api/v1/notebooks/route";

import { InMemoryNotebookRepository } from "./notebook-repository";
import { NotebookService } from "./notebook-service";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

afterEach(() => {
  resetNotebookRouteDependenciesForTests();
});

describe("notebook fetch route", () => {
  it("rejects notebook fetch when only X-User-Id is provided", async () => {
    const response = await getNotebooks(
      new Request("http://localhost/api/v1/notebooks", {
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

  it("returns visible notebooks for the verified session boundary", async () => {
    const repository = new InMemoryNotebookRepository();
    await repository.upsert({
      content: "visible body",
      id: "notebook-visible",
      title: "Visible",
      updatedAt: "2026-05-28T01:00:00.000Z",
      workspaceId: "workspace-route-a",
    });
    await repository.upsert({
      content: "other body",
      id: "notebook-other",
      title: "Other",
      updatedAt: "2026-05-28T01:01:00.000Z",
      workspaceId: "workspace-route-b",
    });
    await repository.upsert({
      content: "deleted body",
      id: "notebook-deleted",
      title: "Deleted",
      updatedAt: "2026-05-28T01:02:00.000Z",
      workspaceId: "workspace-route-a",
    });
    await repository.deleteById({
      deletedAt: "2026-05-28T01:03:00.000Z",
      deletedBy: "route-user",
      id: "notebook-deleted",
      workspaceId: "workspace-route-a",
    });

    setNotebookRouteDependenciesForTests({
      authVerifier: {
        async verifyRequest(request) {
          expect(request.headers.get("authorization")).toBe("Bearer notebooks-token");

          return {
            email: "route@example.test",
            id: "route-user",
          };
        },
      },
      service: new NotebookService({ repository }),
    });

    const response = await getNotebooks(
      new Request(
        "http://localhost/api/v1/notebooks?workspaceId=workspace-route-a",
        {
          headers: {
            Authorization: "Bearer notebooks-token",
            "X-User-Id": "spoofed-owner",
          },
        },
      ),
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        source: "notebook_service",
        workspaceId: "workspace-route-a",
      },
      ok: true,
    });
    expect((json.data as { notebooks: Array<{ id: string }> }).notebooks).toEqual([
      expect.objectContaining({ id: "notebook-visible" }),
    ]);
  });

  it("only returns global notebooks owned by the verified account", async () => {
    const repository = new InMemoryNotebookRepository();
    await repository.upsert({
      content: "owner global body",
      createdBy: "route-user",
      id: "notebook-global-owner",
      title: "Owner Global",
      updatedAt: "2026-05-28T01:05:00.000Z",
      workspaceId: null,
    });
    await repository.upsert({
      content: "other global body",
      createdBy: "other-user",
      id: "notebook-global-other",
      title: "Other Global",
      updatedAt: "2026-05-28T01:06:00.000Z",
      workspaceId: null,
    });
    await repository.upsert({
      content: "legacy global body",
      id: "notebook-global-legacy",
      title: "Legacy Global",
      updatedAt: "2026-05-28T01:07:00.000Z",
      workspaceId: null,
    });

    setNotebookRouteDependenciesForTests({
      authVerifier: {
        async verifyRequest() {
          return {
            email: "route@example.test",
            id: "route-user",
          };
        },
      },
      service: new NotebookService({ repository }),
    });

    const response = await getNotebooks(
      new Request("http://localhost/api/v1/notebooks", {
        headers: {
          Authorization: "Bearer notebooks-token",
        },
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect((json.data as { notebooks: Array<{ id: string }> }).notebooks).toEqual([
      expect.objectContaining({ id: "notebook-global-owner" }),
    ]);
  });
});
