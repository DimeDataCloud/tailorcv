// 3-tier design token system for TailorCV.
//
// Tier 1: RAW palette — single source of truth for actual color values.
//         Update once here, every consumer re-derives.
// Tier 2: SEMANTIC roles — what a color MEANS (bg.canvas, fg.primary, etc).
//         Maps to either light or dark variant based on color scheme.
// Tier 3: COMPONENT — pre-bound semantic shortcuts the screens import.
//         (This is what BRAND already exports; we re-export it here for
//         backward compatibility.)
//
// Adding a new semantic token: add it to BOTH SemanticLight and SemanticDark.
// Both must have the same keys. The TypeScript checker enforces this.

import { BRAND } from './brand';

// ----------------------------------------------------------------
// Tier 1: RAW palette (extended, single source of truth)
// ----------------------------------------------------------------

export const RAW = {
  // Brand
  accent:        '#C8360B',  // blood orange — primary CTA, focus, active tint
  accentSoft:    '#FDE7E2',  // light orange tint
  accentWash:    '#FFF5F2',  // very light wash
  accentDeep:    '#9C2A08',  // pressed / hover state

  // Neutrals
  ink:           '#1F2937',  // charcoal — body text, structural lines, icon default
  inkSoft:       '#4B5563',  // muted text
  muted:         '#6B7280',  // helper text
  faint:         '#9CA3AF',  // placeholder
  hairline:      '#E5E1DC',  // default border
  hairlineStrong:'#D1D5DB',  // input border

  // Surfaces
  surface:       '#FFFFFF',  // card background
  surfaceAlt:    '#F7F4F1',  // warm off-white (section divider bg)
  surfaceMuted:  '#F4F7FA',  // cool off-white
  surfaceSunken: '#EFEAE4',  // deepest surface

  // Status
  success:       '#0F766E',
  successSoft:   '#CCFBF1',
  warn:          '#B45309',
  warnSoft:      '#FEF3C7',
  danger:        '#B91C1C',
  dangerSoft:    '#FEE2E2',
  error:         '#DC2626',  // bright error (banners)
  errorStrong:   '#991B1B',  // error text on light bg
  info:          '#1D4ED8',
  infoSoft:      '#DBEAFE',

  // Hero (Welcome / Processing dark canvases)
  heroBase:      '#0F0F12',
  heroAccent:    '#C8360B',
  heroInk:       '#FFFFFF',
  heroInkSoft:   '#A1A1AA',
  heroHairline:  'rgba(255,255,255,0.08)',
} as const;

// ----------------------------------------------------------------
// Tier 2: SEMANTIC roles — light + dark variants
// ----------------------------------------------------------------

export interface SemanticTokens {
  bg: {
    canvas: string;          // page background
    surface: string;         // card background
    surfaceMuted: string;    // section divider background
    surfaceSunken: string;   // deepest surface
    accentWash: string;      // tinted brand background
    accentSoft: string;      // softer tinted brand background
    hero: string;            // dark hero (Welcome / Processing)
    success: string;
    warn: string;
    danger: string;
    info: string;
  };
  fg: {
    primary: string;         // body text
    secondary: string;       // muted body
    muted: string;           // helper / placeholder
    accent: string;          // link, brand-colored text
    onAccent: string;        // text on accent-colored bg
    inverse: string;         // light text on dark bg
    success: string;
    warn: string;
    danger: string;
  };
  border: {
    default: string;         // hairline
    strong: string;          // input border
    focus: string;           // focus ring
    accent: string;          // accent border
  };
  shadow: {
    sm: string;              // 0.08 opacity, 4 blur
    md: string;              // 0.12 opacity, 8 blur
    lg: string;              // 0.18 opacity, 16 blur
  };
}

export const SEMANTIC_LIGHT: SemanticTokens = {
  bg: {
    canvas:         RAW.surface,
    surface:        RAW.surface,
    surfaceMuted:   RAW.surfaceAlt,
    surfaceSunken:  RAW.surfaceSunken,
    accentWash:     RAW.accentWash,
    accentSoft:     RAW.accentSoft,
    hero:           RAW.heroBase,
    success:        RAW.successSoft,
    warn:           RAW.warnSoft,
    danger:         RAW.dangerSoft,
    info:           RAW.infoSoft,
  },
  fg: {
    primary:        RAW.ink,
    secondary:      RAW.inkSoft,
    muted:          RAW.muted,
    accent:         RAW.accent,
    onAccent:       '#FFFFFF',
    inverse:        '#FFFFFF',
    success:        RAW.success,
    warn:           RAW.warn,
    danger:         RAW.errorStrong,
  },
  border: {
    default:        RAW.hairline,
    strong:         RAW.hairlineStrong,
    focus:          RAW.accent,
    accent:         RAW.accent,
  },
  shadow: {
    sm:             'rgba(31, 41, 55, 0.06)',
    md:             'rgba(31, 41, 55, 0.10)',
    lg:             'rgba(31, 41, 55, 0.16)',
  },
};

export const SEMANTIC_DARK: SemanticTokens = {
  bg: {
    canvas:         '#0E0E10',
    surface:        '#16161A',
    surfaceMuted:   '#1E1E23',
    surfaceSunken:  '#0A0A0C',
    accentWash:     '#2A1812',  // dark orange wash
    accentSoft:     '#3D1F14',  // dark orange soft
    hero:           '#000000',
    success:        '#0F3D38',
    warn:           '#3D2A0B',
    danger:         '#3D1414',
    info:           '#1A2B4F',
  },
  fg: {
    primary:        '#F4F4F5',
    secondary:      '#A1A1AA',
    muted:          '#71717A',
    accent:         '#F87171',  // brighter orange for dark
    onAccent:       '#0E0E10',
    inverse:        '#0E0E10',
    success:        '#5EEAD4',
    warn:           '#FCD34D',
    danger:         '#FCA5A5',
  },
  border: {
    default:        '#27272A',
    strong:         '#3F3F46',
    focus:          '#F87171',
    accent:         '#F87171',
  },
  shadow: {
    sm:             'rgba(0, 0, 0, 0.40)',
    md:             'rgba(0, 0, 0, 0.55)',
    lg:             'rgba(0, 0, 0, 0.70)',
  },
};

// ----------------------------------------------------------------
// Re-export for backward compatibility with existing screen imports.
// New code should prefer RAW + SEMANTIC_LIGHT/SEMANTIC_DARK directly.
// ----------------------------------------------------------------

export { BRAND };

// Convenience: the currently-active semantic tokens.
// In a dark-mode-aware world, replace this with a hook (useTheme).
// For now, default to light since most screens are light-mode-first.
export const SEMANTIC = SEMANTIC_LIGHT;

// ----------------------------------------------------------------
// useTheme — reactive semantic tokens based on device color scheme.
// Returns the active SemanticTokens set (light or dark) and the
// resolved scheme string. Screens that want dark-mode awareness
// call `const T = useTheme()` and read from T.bg.canvas etc.
// ----------------------------------------------------------------

import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

export type ColorScheme = 'light' | 'dark';

export function useTheme(): { tokens: SemanticTokens; scheme: ColorScheme } {
  const scheme = useColorScheme();
  const resolved: ColorScheme = scheme === 'dark' ? 'dark' : 'light';
  const tokens = resolved === 'dark' ? SEMANTIC_DARK : SEMANTIC_LIGHT;
  return { tokens, scheme: resolved };
}
