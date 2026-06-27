export type FloatingWindowScope =
  | "account"
  | "workspace"
  | "resource"
  | "system"
  | "public";

export type FloatingWindowLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type FloatingWindowSize = {
  width: number;
  height: number;
};

export type FloatingWindowInstance = {
  id: string;
  kind: string;
  title: string;
  scope: FloatingWindowScope;
  resourceId?: string;
  workspaceId?: string;
  layout: FloatingWindowLayout;
  previousLayout?: FloatingWindowLayout;
  minimized: boolean;
  maximized: boolean;
  createdAt: string;
  updatedAt: string;
  state?: Record<string, unknown>;
};

export type FloatingOpenWindowInput = {
  kind: string;
  title: string;
  scope: FloatingWindowScope;
  defaultSize: FloatingWindowSize;
  resourceId?: string;
  workspaceId?: string;
  state?: Record<string, unknown>;
  singleton?: boolean;
  allowMultiple?: boolean;
};

export type FloatingWindowState = {
  windows: FloatingWindowInstance[];
  maxZIndex: number;
  focusedWindowId: string | null;
};

export type FloatingWindowLifecycleOptions = {
  createId?: (kind: string, index: number) => string;
  now?: () => string;
};
