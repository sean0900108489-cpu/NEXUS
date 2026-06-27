import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ServiceBoardEmptyState, ServiceBoardErrorState } from "./ServiceBoardStates";
import { SERVICE_BOARD_DEMO_TASKS } from "./service-board-demo-data";
import { ServiceBoardWindow } from "./ServiceBoardWindow";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";

const windowProps: NexusWindowAppProps = {
  close: vi.fn(),
  setTitle: vi.fn(),
  window: {
    id: "floating-window:service-board:test",
    kind: "service-board",
    title: "Service Board",
    scope: "account",
    layout: { x: 0, y: 0, width: 760, height: 560, zIndex: 1 },
    minimized: false,
    maximized: false,
    createdAt: "2026-06-28T00:00:00.000Z",
    updatedAt: "2026-06-28T00:00:00.000Z",
  } as unknown as NexusWindowAppProps["window"],
};

describe("ServiceBoardWindow", () => {
  it("renders seeded service requests as the first R5 Workspace product prototype", () => {
    const html = renderToStaticMarkup(<ServiceBoardWindow {...windowProps} />);

    expect(html).toContain("Service Board");
    expect(html).toContain("Local service requests");
    expect(html).toContain("MVP prototype");
    expect(html).toContain(SERVICE_BOARD_DEMO_TASKS[0].title);
    expect(html).toContain(SERVICE_BOARD_DEMO_TASKS[1].title);
    expect(html).toContain("Open");
    expect(html).toContain("Shortlisted");
    expect(html).toContain("Booked");
    expect(html).not.toContain("payment");
    expect(html).not.toContain("checkout");
  });

  it("renders explicit empty and error states for future data-backed loading", () => {
    const emptyHtml = renderToStaticMarkup(<ServiceBoardEmptyState />);
    const errorHtml = renderToStaticMarkup(
      <ServiceBoardErrorState message="Unable to load service requests" />,
    );

    expect(emptyHtml).toContain("No service requests match this view");
    expect(errorHtml).toContain("Unable to load service requests");
  });
});
