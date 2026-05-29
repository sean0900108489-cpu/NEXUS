export const NEXUS_STYLE_MIN_TEXT_CONTRAST = 4.5;

export type NexusStyleContrastResult = {
  ratio: number;
  passes: boolean;
};

export function getNexusStyleContrastRatio(
  foreground: string,
  background: string,
): number | null {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);

  if (!foregroundRgb || !backgroundRgb) {
    return null;
  }

  const lighter = Math.max(
    relativeLuminance(foregroundRgb),
    relativeLuminance(backgroundRgb),
  );
  const darker = Math.min(
    relativeLuminance(foregroundRgb),
    relativeLuminance(backgroundRgb),
  );

  return roundContrast((lighter + 0.05) / (darker + 0.05));
}

export function evaluateNexusStyleTextContrast(
  foreground: string,
  background: string,
  minimumRatio = NEXUS_STYLE_MIN_TEXT_CONTRAST,
): NexusStyleContrastResult | null {
  const ratio = getNexusStyleContrastRatio(foreground, background);

  if (ratio === null) {
    return null;
  }

  return {
    passes: ratio >= minimumRatio,
    ratio,
  };
}

function parseHexColor(value: string): [number, number, number] | null {
  const normalized = value.trim();
  const shortMatch = /^#([0-9a-f]{3})$/i.exec(normalized);

  if (shortMatch) {
    return shortMatch[1]
      .split("")
      .map((channel) => Number.parseInt(`${channel}${channel}`, 16)) as [
      number,
      number,
      number,
    ];
  }

  const longMatch = /^#([0-9a-f]{6})$/i.exec(normalized);

  if (!longMatch) {
    return null;
  }

  const hex = longMatch[1];

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance([red, green, blue]: [number, number, number]) {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((channel) => {
    const value = channel / 255;

    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

function roundContrast(value: number) {
  return Math.round(value * 100) / 100;
}
