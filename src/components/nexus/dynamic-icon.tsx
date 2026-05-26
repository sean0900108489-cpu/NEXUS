import * as LucideIcons from "lucide-react";
import { Box, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";

type DynamicIconProps = LucideProps & {
  name: string;
  fallbackName?: string;
};

function toPascalIconName(name: string) {
  return name
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function isRenderableIcon(candidate: unknown): candidate is ComponentType<LucideProps> {
  return (
    typeof candidate === "function" ||
    (typeof candidate === "object" && candidate !== null && "$$typeof" in candidate)
  );
}

export function DynamicIcon({
  fallbackName = "Box",
  name,
  ...props
}: DynamicIconProps) {
  const icons = LucideIcons as unknown as Record<string, unknown>;
  const candidate = icons[toPascalIconName(name)] ?? icons[name];
  const fallback = icons[toPascalIconName(fallbackName)] ?? icons[fallbackName];
  const Icon = isRenderableIcon(candidate)
    ? candidate
    : isRenderableIcon(fallback)
      ? fallback
      : Box;

  return <Icon {...props} />;
}
